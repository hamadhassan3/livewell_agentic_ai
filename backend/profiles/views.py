from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from .serializers import (
    RegisterSerializer, CurrentQuestionSerializer, SubmitAnswerSerializer,
    UserQuestionnaireSessionSerializer, UserProfileSerializer, LeaderboardSerializer,
    UserPreferencesSerializer, ForestDataSerializer, TreeSerializer, ForestConfigurationSerializer
)
from .models import QuestionnaireTemplate, Question, UserQuestionnaireSession, Answer, UserPreferences, ForestProgress, Tree, ForestConfiguration
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

User = get_user_model()


# Registration API
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_question(request, questionnaire_name):
    """
    API to get the current question for a specific questionnaire
    """
    user = request.user
    
    # Get questionnaire template
    questionnaire = get_object_or_404(QuestionnaireTemplate, name=questionnaire_name, is_active=True)
    
    # Get or create session
    session, created = UserQuestionnaireSession.objects.get_or_create(
        user=user,
        questionnaire=questionnaire,
        defaults={'current_question_order': 1}
    )
    
    if session.is_completed:
        return Response({
            'questionnaire_name': questionnaire_name,
            'question': None,
            'current_order': session.current_question_order,
            'total_questions': questionnaire.questions.count(),
            'is_completed': True,
            'message': 'Questionnaire already completed'
        })
    
    # Get current question
    try:
        current_question = questionnaire.questions.get(order=session.current_question_order)
    except Question.DoesNotExist:
        # Mark as completed if no more questions
        session.is_completed = True
        session.completed_at = timezone.now()
        session.save()
        
        return Response({
            'questionnaire_name': questionnaire_name,
            'question': None,
            'current_order': session.current_question_order,
            'total_questions': questionnaire.questions.count(),
            'is_completed': True,
            'message': 'Questionnaire completed'
        })
    
    # Serialize response
    response_data = {
        'questionnaire_name': questionnaire_name,
        'question': {
            'id': current_question.id,
            'order': current_question.order,
            'text': current_question.text,
            'question_type': current_question.question_type,
            'options': current_question.options,
            'is_required': current_question.is_required,
            'metadata': current_question.metadata,
        },
        'current_order': session.current_question_order,
        'total_questions': questionnaire.questions.count(),
        'is_completed': False
    }
    
    return Response(response_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_answer(request):
    """
    API to submit an answer and advance to the next question
    """
    serializer = SubmitAnswerSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    questionnaire_name = serializer.validated_data['questionnaire_name']
    answer_data = serializer.validated_data['answer_data']
    
    # Get questionnaire template
    questionnaire = get_object_or_404(QuestionnaireTemplate, name=questionnaire_name, is_active=True)
    
    # Get or create session
    session, created = UserQuestionnaireSession.objects.get_or_create(
        user=user,
        questionnaire=questionnaire,
        defaults={'current_question_order': 1}
    )
    
    if session.is_completed:
        return Response({
            'error': 'Questionnaire already completed'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get current question
    try:
        current_question = questionnaire.questions.get(order=session.current_question_order)
    except Question.DoesNotExist:
        return Response({
            'error': 'No current question found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Save answer
    answer, created = Answer.objects.update_or_create(
        session=session,
        question=current_question,
        defaults={
            'answer_data': answer_data
        }
    )
    
    # Move to next question
    next_question_order = session.current_question_order + 1
    next_question_exists = questionnaire.questions.filter(order=next_question_order).exists()
    
    if next_question_exists:
        session.current_question_order = next_question_order
        session.save()
        
        return Response({
            'message': 'Answer submitted successfully',
            'next_question_order': next_question_order,
            'is_completed': False
        })
    else:
        # Mark questionnaire as completed
        session.current_question_order = next_question_order
        session.is_completed = True
        session.completed_at = timezone.now()
        session.save()
        
        return Response({
            'message': 'Questionnaire completed successfully',
            'next_question_order': None,
            'is_completed': True
        })


class UserProfileView(APIView):
    """
    API view for user profile operations (read, update, delete)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user's profile"""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        """Update current user's profile"""
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        """Partially update current user's profile"""
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request):
        """Delete current user's account"""
        user = request.user
        user.delete()
        return Response(
            {"message": "User account deleted successfully"},
            status=status.HTTP_204_NO_CONTENT
        )


class GoogleAuthView(APIView):
    """
    API view for Google OAuth authentication
    Accepts Google access token and returns JWT tokens
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Exchange Google access token for JWT tokens

        Request body:
        {
            "access_token": "google_access_token_here"
        }
        """
        google_access_token = request.data.get('access_token')

        if not google_access_token:
            return Response(
                {'error': 'access_token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Fetch user info from Google using the access token
            google_user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
            headers = {'Authorization': f'Bearer {google_access_token}'}

            import requests
            response = requests.get(google_user_info_url, headers=headers)

            if response.status_code != 200:
                return Response(
                    {'error': 'Invalid Google access token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            google_user = response.json()

            # Extract user information
            email = google_user.get('email')
            name = google_user.get('name', '')
            google_id = google_user.get('id')
            picture = google_user.get('picture', '')

            if not email:
                return Response(
                    {'error': 'Email not provided by Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'name': name,
                    'is_active': True,
                }
            )

            # Update user info if user already exists
            if not created:
                user.name = name
                user.save()

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # Return tokens and user info
            return Response({
                'access': access_token,
                'refresh': refresh_token,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name,
                    'photo': picture,
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': f'Authentication failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LeaderboardView(APIView):
    """
    API view for leaderboard data
    Returns top 20 users by points and current user's position if not in top 20
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get leaderboard with top 20 users and current user's position
        """
        # Get all users with their forest progress points
        from django.db.models import OuterRef, Subquery, IntegerField, Value
        from django.db.models.functions import Coalesce
        
        # Subquery to get points from ForestProgress
        forest_points = ForestProgress.objects.filter(
            user=OuterRef('pk')
        ).values('points')[:1]
        
        # Get users with their points from ForestProgress (default to 0 if no progress exists)
        users_with_points = User.objects.annotate(
            forest_points=Coalesce(
                Subquery(forest_points, output_field=IntegerField()),
                Value(0)
            )
        ).order_by('-forest_points', 'email')
        
        # Get top 20 users
        top_users = users_with_points[:20]

        # Create leaderboard entries with ranks for top users
        top_users_data = []
        for idx, user in enumerate(top_users, start=1):
            top_users_data.append({
                'rank': idx,
                'email': user.email,
                'points': user.forest_points
            })

        # Check if current user is in top 20
        current_user_in_top = request.user in top_users

        # If current user is not in top 20, calculate their position
        current_user_data = None
        if not current_user_in_top:
            # Get current user's forest progress
            current_forest_progress, _ = ForestProgress.objects.get_or_create(user=request.user)
            current_user_points = current_forest_progress.points
            
            # Count users with more points than current user
            users_above = users_with_points.filter(forest_points__gt=current_user_points).count()
            # Count users with same points but alphabetically before current user's email
            users_same_points_above = users_with_points.filter(
                forest_points=current_user_points,
                email__lt=request.user.email
            ).count()

            current_user_rank = users_above + users_same_points_above + 1
            current_user_data = {
                'rank': current_user_rank,
                'email': request.user.email,
                'points': current_user_points
            }

        response_data = {
            'top_users': top_users_data,
            'current_user': current_user_data
        }

        serializer = LeaderboardSerializer(response_data)
        return Response(serializer.data)

class UserPreferencesView(APIView):
    """
    API view for user preferences operations (read, create, update)
    Supports partial updates - any number of fields can be updated without affecting others
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get current user's preferences.
        If preferences don't exist, returns default values.
        """
        try:
            preferences = request.user.preferences
            serializer = UserPreferencesSerializer(preferences)
            return Response(serializer.data)
        except UserPreferences.DoesNotExist:
            # Return default preferences structure
            return Response({
                'message': 'No preferences found. Use POST/PUT to create preferences.',
                'default_preferences': UserPreferencesSerializer().to_representation(UserPreferences())
            }, status=status.HTTP_404_NOT_FOUND)
    
    def post(self, request):
        """
        Create user preferences (if they don't exist) or update existing ones.
        Supports partial data - only provided fields will be set/updated.
        """
        preferences, created = UserPreferences.objects.get_or_create(
            user=request.user,
            defaults={}
        )
        
        serializer = UserPreferencesSerializer(
            preferences, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            # If this is a new preferences object and we're setting initial data,
            # update individual timestamps for all provided fields
            if created and request.data:
                preferences.update_individual_timestamps(list(request.data.keys()))
                
            serializer.save()
            action = "created" if created else "updated"
            return Response({
                'message': f'Preferences {action} successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self, request):
        """
        Update user preferences (create if they don't exist).
        Supports partial data - only provided fields will be updated.
        """
        preferences, created = UserPreferences.objects.get_or_create(
            user=request.user,
            defaults={}
        )
        
        serializer = UserPreferencesSerializer(
            preferences, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            # If this is a new preferences object and we're setting initial data,
            # update individual timestamps for all provided fields
            if created and request.data:
                preferences.update_individual_timestamps(list(request.data.keys()))
                
            serializer.save()
            action = "created" if created else "updated"
            return Response({
                'message': f'Preferences {action} successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        """
        Partially update user preferences.
        Only updates fields provided in the request data.
        """
        try:
            preferences = request.user.preferences
            created = False
        except UserPreferences.DoesNotExist:
            # Create preferences if they don't exist
            preferences = UserPreferences.objects.create(user=request.user)
            created = True
        
        serializer = UserPreferencesSerializer(
            preferences, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            # If this is a new preferences object and we're setting initial data,
            # update individual timestamps for all provided fields
            if created and request.data:
                preferences.update_individual_timestamps(list(request.data.keys()))
                
            serializer.save()
            return Response({
                'message': 'Preferences updated successfully',
                'data': serializer.data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request):
        """
        Reset user preferences to default values.
        """
        try:
            preferences = request.user.preferences
            preferences.delete()
            return Response({
                'message': 'Preferences reset to defaults successfully'
            }, status=status.HTTP_204_NO_CONTENT)
        except UserPreferences.DoesNotExist:
            return Response({
                'message': 'No preferences found to delete'
            }, status=status.HTTP_404_NOT_FOUND)


class ForestDataView(APIView):
    """
    API endpoint to retrieve comprehensive forest/gamification data for the current user.
    This includes points, daily goals status, overall achievements, and tree progress.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get forest data for the authenticated user.
        Creates ForestProgress if it doesn't exist.
        """
        user = request.user
        
        # Get or create ForestProgress for the user
        forest_progress, created = ForestProgress.objects.get_or_create(user=user)
        
        # Update achievement totals from tracking data
        forest_progress.update_achievement_totals()
        
        # Serialize and return the forest data
        serializer = ForestDataSerializer(forest_progress)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserTreesView(APIView):
    """
    API endpoint to retrieve user's completed trees history
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get all completed trees for the authenticated user
        """
        trees = Tree.objects.filter(user=request.user).order_by('-completed_at')
        serializer = TreeSerializer(trees, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ForestConfigurationView(APIView):
    """
    API endpoint to retrieve current forest configuration
    """
    permission_classes = [IsAuthenticated]  # Can be AllowAny if you want config to be public
    
    def get(self, request):
        """
        Get current active forest configuration
        """
        config = ForestConfiguration.get_active_config()
        serializer = ForestConfigurationSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

