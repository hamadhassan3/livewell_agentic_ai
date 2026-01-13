import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView 
from django.utils import timezone # Keep this for other parts of the file
from datetime import date, datetime # Import datetime for parsing date strings
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from .models import Goal, Medication, MedicationTaken, GoalCompleted, Event, StepCount
from .serializers import GoalSerializer, MedicationSerializer, MedicationTakenSerializer, DashboardMedicationSerializer, GoalCompletedSerializer, DashboardGoalSerializer, EventSerializer, StepCountSerializer
from profiles.models import ForestProgress, ForestConfiguration
from serpapi import GoogleSearch

class GoalViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to view and edit their goals.
    """
    serializer_class = GoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        This view should return a list of all the goals
        for the currently authenticated user.
        """
        return self.request.user.goals.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard_goals(self, request):
        """
        Get goals formatted for dashboard with today's completion status.
        """
        goals = self.get_queryset().filter(is_active=True)
        serializer = DashboardGoalSerializer(
            goals, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='mark-completed')
    def mark_completed(self, request, pk=None):
        """
        Mark a goal as completed for today and award points.
        """
        goal = self.get_object()
        notes = request.data.get('notes', '')

        # Check if already completed today
        today = date.today()
        existing_record = GoalCompleted.objects.filter(
            goal=goal,
            user=request.user,
            date_completed=today
        ).first()

        if existing_record:
            return Response(
                {'message': 'Goal already marked as completed for today'},
                status=status.HTTP_200_OK
            )

        # Create new completed record
        completed_record = GoalCompleted.objects.create(
            goal=goal,
            user=request.user,
            notes=notes
        )

        # Award points to the user via ForestProgress with category tracking
        forest_progress, created = ForestProgress.objects.get_or_create(user=request.user)
        config = ForestConfiguration.get_active_config()
        
        # Determine category based on goal category
        category_map = {
            'mind': 'mindfulness',
            'social': 'social',
            'nutrition': 'nutrition',
            'activity': 'activity'
        }
        category = category_map.get(goal.category, None)
        
        forest_progress.add_points(config.points_per_achievement, category=category)

        serializer = GoalCompletedSerializer(completed_record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='unmark-completed')
    def unmark_completed(self, request, pk=None):
        """
        Unmark a goal as completed for today and deduct points.
        """
        goal = self.get_object()

        # Find and delete today's record for this goal
        today = date.today()
        completed_record = GoalCompleted.objects.filter(
            goal=goal,
            user=request.user,
            date_completed=today
        ).first()

        if not completed_record:
            return Response(
                {'error': 'No completion record found for this goal today'},
                status=status.HTTP_404_NOT_FOUND
            )

        completed_record.delete()

        # Deduct points from the user via ForestProgress
        forest_progress, created = ForestProgress.objects.get_or_create(user=request.user)
        config = ForestConfiguration.get_active_config()
        
        forest_progress.points = max(0, forest_progress.points - config.points_per_achievement)
        # Recalculate tree progress after deducting points
        points_per_tree = config.points_per_tree
        forest_progress.completed_trees = forest_progress.points // points_per_tree
        forest_progress.current_cycle_points = forest_progress.points % points_per_tree
        forest_progress.save()

        return Response(
            {'message': 'Goal unmarked successfully'},
            status=status.HTTP_200_OK
        )


class SerpApiSearch(viewsets.ViewSet):
    """
    An API view to perform a web search using SerpAPI.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        description="Search for events using SerpAPI's Google Events engine.",
        parameters=[
            OpenApiParameter(name='query', description='The search query for events (e.g., "Art classes").', required=True, type=OpenApiTypes.STR),
            OpenApiParameter(name='location', description='The location for the event search (e.g., "Adelaide").', required=True, type=OpenApiTypes.STR),
        ],
        responses={
            200: {
                'description': 'A list of event results from SerpAPI.',
            }
        }
    )
    def list(self, request, *args, **kwargs):
        """
        Handles GET requests to search SerpAPI.
        Expects 'query' and 'location' parameters in the request.
        e.g., /api/tracking/search-events/?query=Art+classes&location=Adelaide
        """
        query = request.query_params.get('query', None)
        location = request.query_params.get('location', None)

        if not query or not location:
            return Response(
                {"error": "Both 'query' and 'location' parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        api_key = os.getenv('SERPAPI_API_KEY')
        if not api_key:
            return Response(
                {"error": "SerpAPI is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        params = {
            "api_key": api_key,
            "engine": "google_events", # Using google_events engine
            "q": query,
            "hl": "en",
            "gl": "us",
            "google_domain": "google.com.au",
            "location": location,
        }

        try:
            search = GoogleSearch(params)
            results = search.get_dict()
            # Check if SerpAPI returned an error
            if "error" in results:
                return Response({"error": results["error"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Extract the events_results list, defaulting to an empty list if not found
            events = results.get("events_results", [])
            
            return Response(events)
        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MedicationViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to view and edit their medications.
    """
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        This view should return a list of all medications
        for the currently authenticated user.
        """
        return self.request.user.medications.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard_medications(self, request):
        """
        Get medications formatted for dashboard with today's taken status.
        """
        medications = self.get_queryset().filter(is_active=True)
        serializer = DashboardMedicationSerializer(
            medications, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='mark-taken')
    def mark_taken(self, request, pk=None):
        """
        Mark a medication as taken for a specific time.
        """
        medication = self.get_object()
        scheduled_time = request.data.get('scheduled_time')
        notes = request.data.get('notes', '')

        # Debug logging
        print(f"DEBUG: scheduled_time received: '{scheduled_time}'")
        print(f"DEBUG: medication.reminder_times: {medication.reminder_times}")
        print(f"DEBUG: scheduled_time type: {type(scheduled_time)}")

        if not scheduled_time:
            return Response(
                {'error': 'scheduled_time is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if scheduled_time not in medication.reminder_times:
            return Response(
                {'error': f'Invalid scheduled_time "{scheduled_time}" for this medication. Valid times: {medication.reminder_times}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already taken today for this time
        today = date.today()
        existing_record = MedicationTaken.objects.filter(
            medication=medication,
            user=request.user,
            scheduled_time=scheduled_time,
            date_taken=today
        ).first()

        if existing_record:
            return Response(
                {'message': 'Medication already marked as taken for this time today'}, 
                status=status.HTTP_200_OK
            )

        # Create new taken record
        taken_record = MedicationTaken.objects.create(
            medication=medication,
            user=request.user,
            scheduled_time=scheduled_time,
            notes=notes
        )

        serializer = MedicationTakenSerializer(taken_record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='unmark-taken')
    def unmark_taken(self, request, pk=None):
        """
        Unmark a medication as taken for a specific time today.
        """
        medication = self.get_object()
        scheduled_time = request.data.get('scheduled_time')

        # Debug logging
        print(f"DEBUG UNMARK: scheduled_time received: '{scheduled_time}'")
        print(f"DEBUG UNMARK: medication.reminder_times: {medication.reminder_times}")

        if not scheduled_time:
            return Response(
                {'error': 'scheduled_time is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find and delete today's record for this medication and time
        today = date.today()
        taken_record = MedicationTaken.objects.filter(
            medication=medication,
            user=request.user,
            scheduled_time=scheduled_time,
            date_taken=today
        ).first()

        if not taken_record:
            return Response(
                {'error': 'No record found for this medication and time today'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        taken_record.delete()
        return Response(
            {'message': 'Medication unmarked successfully'}, 
            status=status.HTTP_200_OK
        )


class MedicationTakenViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and managing medication taken records.
    """
    serializer_class = MedicationTakenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return medication taken records for the authenticated user.
        """
        return MedicationTaken.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GoalCompletedViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and managing goal completion records.
    """
    serializer_class = GoalCompletedSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return goal completion records for the authenticated user.
        """
        return GoalCompleted.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EventViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and managing user-saved events.
    """
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return event records for the authenticated user.
        """
        return self.request.user.events.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class StepCountViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to view and manage their daily step counts.
    """
    serializer_class = StepCountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        This view should return a list of all step counts
        for the currently authenticated user, with optional date filtering.
        """
        queryset = self.request.user.step_counts.all()
        
        # Filter by specific date if provided in query parameters
        date_param = self.request.query_params.get('date')
        if date_param:
            try:
                # Ensure the date is in YYYY-MM-DD format
                filter_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                queryset = queryset.filter(date=filter_date)
            except ValueError:
                # If date format is invalid, the list method will return a 400 error.
                # For get_queryset, we can return an empty queryset to avoid further errors
                # before the list method's explicit error response.
                return StepCount.objects.none()
        
        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter step counts by a specific date (YYYY-MM-DD).',
                required=False
            )
        ],
        responses={
            200: StepCountSerializer(many=True),
            400: {'description': 'Invalid date format'}
        }
    )
    def list(self, request, *args, **kwargs):
        date_param = self.request.query_params.get('date')
        if date_param:
            try:
                datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Please use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().list(request, *args, **kwargs)

    @extend_schema(
        request=StepCountSerializer,
        responses={
            201: StepCountSerializer, # Created
            200: StepCountSerializer, # Updated
            400: {'description': 'Bad Request'}
        }
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = self.request.user
        date_data = serializer.validated_data['date']
        steps_data = serializer.validated_data['steps']

        # Use update_or_create to handle both creation and updating existing records
        step_count, created = StepCount.objects.update_or_create(
            user=user,
            date=date_data,
            defaults={'steps': steps_data}
        )
        
        # Serialize the resulting object (either newly created or updated)
        response_serializer = self.get_serializer(step_count)
        
        if created:
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            # If the record was updated, return 200 OK
            return Response(response_serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """
        Get step count data for the current week (Monday to Sunday).
        Returns a list of 7 days, with 0 steps for future days or days with no data.
        """
        from datetime import timedelta

        user = request.user
        today = date.today()

        # Calculate the start of the week (Monday)
        start_of_week = today - timedelta(days=today.weekday())
        
        # Calculate the end of the week (Sunday)
        end_of_week = start_of_week + timedelta(days=6)

        # Get step counts for the user for the current week
        step_counts = StepCount.objects.filter(
            user=user,
            date__range=[start_of_week, end_of_week]
        )

        # Create a dictionary for quick lookups
        steps_by_date = {sc.date: sc.steps for sc in step_counts}

        # Build the response for the full week
        weekly_data = []
        for i in range(7):
            current_day = start_of_week + timedelta(days=i)
            steps = steps_by_date.get(current_day, 0)
            
            weekly_data.append({
                'day': current_day.strftime('%a'),
                'steps': steps
            })

        return Response(weekly_data)