from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import QuestionnaireTemplate, Question, UserQuestionnaireSession, Answer, UserPreferences, ForestProgress, Tree, ForestConfiguration

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ("name", "email", "password")

    def validate(self, attrs):
        # TODO: Add any additional validation logic here.
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'order', 'text', 'question_type', 'options', 'is_required', 'metadata']


class QuestionnaireTemplateSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuestionnaireTemplate
        fields = ['id', 'name', 'description', 'version', 'questions']


class CurrentQuestionSerializer(serializers.Serializer):
    questionnaire_name = serializers.CharField(max_length=100)
    question = QuestionSerializer(read_only=True)
    current_order = serializers.IntegerField(read_only=True)
    total_questions = serializers.IntegerField(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)


class SubmitAnswerSerializer(serializers.Serializer):
    questionnaire_name = serializers.CharField(max_length=100)
    answer_data = serializers.JSONField()
    
    def validate_questionnaire_name(self, value):
        try:
            QuestionnaireTemplate.objects.get(name=value, is_active=True)
        except QuestionnaireTemplate.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive questionnaire.")
        return value


class UserQuestionnaireSessionSerializer(serializers.ModelSerializer):
    questionnaire_name = serializers.CharField(source='questionnaire.name', read_only=True)
    
    class Meta:
        model = UserQuestionnaireSession
        fields = ['id', 'questionnaire_name', 'started_at', 'completed_at', 'current_question_order', 'is_completed', 'total_score']


class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField(read_only=True)
    bmi = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'gender', 'date_of_birth', 'height', 'weight', 'age', 'bmi']
        read_only_fields = ['id', 'email']

    def get_age(self, obj):
        if obj.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - obj.date_of_birth.year - ((today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day))
        return None

    def get_bmi(self, obj):
        if obj.height and obj.weight:
            height_m = float(obj.height) / 100
            return round(float(obj.weight) / (height_m ** 2), 2)
        return None


class LeaderboardEntrySerializer(serializers.Serializer):
    """
    Serializer for a single leaderboard entry.
    """
    rank = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    points = serializers.IntegerField(read_only=True)


class LeaderboardSerializer(serializers.Serializer):
    """
    Serializer for the leaderboard response.
    """
    top_users = LeaderboardEntrySerializer(many=True, read_only=True)
    current_user = LeaderboardEntrySerializer(read_only=True, allow_null=True)


class UserPreferencesSerializer(serializers.ModelSerializer):
    """
    Serializer for UserPreferences model with partial update support.
    Allows updating any number of fields without affecting others.
    """
    
    class Meta:
        model = UserPreferences
        exclude = ['user']
        read_only_fields = [
            # Individual field update timestamps
            'is_diabetic_updated_at', 'is_hypertensive_updated_at', 'has_heart_disease_updated_at',
            'has_arthritis_updated_at', 'has_osteoporosis_updated_at', 'has_vision_impairment_updated_at',
            'has_hearing_impairment_updated_at', 'has_memory_concerns_updated_at', 
            'other_health_conditions_updated_at', 'takes_medications_updated_at',
            'medication_reminder_enabled_updated_at', 'medication_reminder_times_updated_at',
            'activity_level_updated_at', 'preferred_exercise_types_updated_at',
            'exercise_goal_minutes_per_week_updated_at', 'social_preference_updated_at',
            'interested_in_group_activities_updated_at', 'stress_level_updated_at',
            'interested_in_mindfulness_updated_at', 'interested_in_meditation_updated_at',
            'typical_bedtime_updated_at', 'typical_wake_time_updated_at',
            'sleep_quality_rating_updated_at', 'diet_type_updated_at', 'food_allergies_updated_at',
            'water_intake_goal_liters_updated_at', 'mobility_level_updated_at',
            'needs_transportation_assistance_updated_at', 'tech_comfort_level_updated_at',
            'notification_frequency_updated_at', 'notification_time_preference_updated_at',
            'personality_type_updated_at', 'motivation_type_updated_at',
            'prefers_short_term_goals_updated_at', 'prefers_long_term_goals_updated_at',
            'goal_reminder_enabled_updated_at', 'emergency_contact_name_updated_at',
            'emergency_contact_phone_updated_at', 'emergency_contact_relationship_updated_at',
            'created_at', 'updated_at'
        ]
        
    def validate_medication_reminder_times(self, value):
        """
        Validate that medication reminder times are valid time strings.
        Expected format: ["08:00", "14:00", "20:00"]
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of time strings")
        
        for time_str in value:
            if not isinstance(time_str, str):
                raise serializers.ValidationError("Each time must be a string in HH:MM format")
            try:
                from datetime import datetime
                datetime.strptime(time_str, '%H:%M')
            except ValueError:
                raise serializers.ValidationError(f"Invalid time format: {time_str}. Use HH:MM format")
        
        return value
    
    def validate_preferred_exercise_types(self, value):
        """
        Validate that preferred exercise types is a list of strings.
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of exercise types")
        
        for exercise in value:
            if not isinstance(exercise, str):
                raise serializers.ValidationError("Each exercise type must be a string")
        
        return value
    
    def validate_water_intake_goal_liters(self, value):
        """
        Validate water intake goal is reasonable (0.5 - 10 liters).
        """
        if value is not None and (value < 0.5 or value > 10):
            raise serializers.ValidationError("Water intake goal must be between 0.5 and 10 liters")
        return value
    
    def validate_exercise_goal_minutes_per_week(self, value):
        """
        Validate exercise goal is reasonable (0 - 2000 minutes per week).
        """
        if value is not None and (value < 0 or value > 2000):
            raise serializers.ValidationError("Exercise goal must be between 0 and 2000 minutes per week")
        return value
    
    def validate_sleep_quality_rating(self, value):
        """
        Validate sleep quality rating is between 1 and 10.
        """
        if value is not None and (value < 1 or value > 10):
            raise serializers.ValidationError("Sleep quality rating must be between 1 and 10")
        return value
    
    def validate_emergency_contact_phone(self, value):
        """
        Basic phone number validation.
        """
        if value and len(value.replace(' ', '').replace('-', '').replace('+', '')) < 10:
            raise serializers.ValidationError("Please provide a valid phone number")
        return value
    
    def to_representation(self, instance):
        """
        Custom representation to include computed fields.
        """
        data = super().to_representation(instance)
        
        # Add computed fields
        data['health_risk_factors'] = instance.get_health_risk_factors()
        data['recommended_exercise_duration'] = instance.get_recommended_exercise_duration()
        data['is_high_risk_user'] = instance.is_high_risk_user()
        
        return data
    
    def update(self, instance, validated_data):
        """
        Custom update method to handle partial updates efficiently.
        Only updates fields that are provided in the request.
        Also updates individual field timestamps automatically.
        """
        # Track which fields are being updated
        updated_field_names = list(validated_data.keys())
        
        # Update the fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update individual field timestamps based on which fields were changed
        instance.update_individual_timestamps(updated_field_names)
        
        instance.save()
        return instance


class TreeSerializer(serializers.ModelSerializer):
    """
    Serializer for Tree model to display user's completed trees
    """
    completed_date = serializers.DateTimeField(source='completed_at', read_only=True)
    total_goals = serializers.SerializerMethodField()
    
    class Meta:
        model = Tree
        fields = [
            'id',
            'tree_number',
            'completed_date',
            'mindfulness_count',
            'social_count',
            'nutrition_count',
            'medications_count',
            'activity_count',
            'total_points',
            'total_goals'
        ]
    
    def get_total_goals(self, obj):
        return obj.get_total_goals()


class ForestConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for ForestConfiguration model
    """
    points_per_tree = serializers.ReadOnlyField()
    
    class Meta:
        model = ForestConfiguration
        fields = [
            'id',
            'points_per_achievement',
            'points_per_stage',
            'stages_per_tree',
            'points_per_tree',
            'category_mappings',
            'stage_definitions',
            'is_active'
        ]


class ForestDataSerializer(serializers.Serializer):
    """
    Serializer for the forest/gamification data API response.
    Matches the expected frontend ForestData interface.
    """
    userPoints = serializers.IntegerField(source='points', read_only=True)
    dailyGoals = serializers.SerializerMethodField()
    overallAchievements = serializers.SerializerMethodField()
    treeProgress = serializers.SerializerMethodField()
    configuration = serializers.SerializerMethodField()
    
    def get_dailyGoals(self, obj):
        """
        Get daily goals completion status from tracking models
        """
        daily_status = obj.get_daily_goals_status()
        return {
            'mindfulness': daily_status['mindfulness'],
            'socialConnection': daily_status['socialConnection'],
            'nutrition': daily_status['nutrition'],
            'medications': daily_status['medications'],
            'activity': daily_status['activity']
        }
    
    def get_overallAchievements(self, obj):
        """
        Get overall achievement counts and points
        """
        return {
            'mindfulness': obj.total_mindfulness,
            'socialConnection': obj.total_social_connection,
            'nutrition': obj.total_nutrition,
            'medications': obj.total_medications,
            'points': obj.points,
            'activity': obj.total_activity
        }
    
    def get_treeProgress(self, obj):
        """
        Get tree growth progress information
        """
        config = ForestConfiguration.get_active_config()
        return {
            'pointsPerTree': config.points_per_tree,
            'currentCycle': obj.current_cycle_points,
            'completedTrees': obj.completed_trees
        }
    
    def get_configuration(self, obj):
        """
        Get current forest configuration
        """
        config = ForestConfiguration.get_active_config()
        return ForestConfigurationSerializer(config).data
