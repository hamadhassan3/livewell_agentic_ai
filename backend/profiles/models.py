from django.db import models
import json
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)
    

class QuestionnaireTemplate(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=20, default='1.0')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} v{self.version}"


class Question(models.Model):
    QUESTION_TYPES = [
        ('SINGLE_CHOICE', 'Single Choice'),
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('TEXT', 'Text'),
        ('NUMBER', 'Number'),
        ('SCALE', 'Scale'),
    ]
    
    questionnaire = models.ForeignKey(QuestionnaireTemplate, on_delete=models.CASCADE, related_name='questions')
    order = models.PositiveIntegerField()
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    options = models.JSONField(default=list, blank=True)
    is_required = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['questionnaire', 'order']
        unique_together = ['questionnaire', 'order']
    
    def __str__(self):
        return f"{self.questionnaire.name} - Q{self.order}: {self.text[:50]}"


class User(AbstractUser):
    """
    Custom user model that extends Django's AbstractUser.
    """
    current_questionnaire_progress = models.JSONField(default=dict, blank=True)

    #
    username = None
    email = models.EmailField(_('email address'), unique=True)
    name = models.CharField(_('name'), max_length=255, blank=True)

    # Health and demographic fields
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('P', 'Prefer not to say'),
    ]
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, help_text="Height in centimeters")
    weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, help_text="Weight in kilograms")
    

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager() # Custom manager
    
    def get_current_question(self, questionnaire_name):
        progress = self.current_questionnaire_progress.get(questionnaire_name, {})
        return progress.get('current_question_order', 1)
    
    def set_current_question(self, questionnaire_name, question_order):
        if questionnaire_name not in self.current_questionnaire_progress:
            self.current_questionnaire_progress[questionnaire_name] = {}
        self.current_questionnaire_progress[questionnaire_name]['current_question_order'] = question_order
        self.save()
    
    def reset_questionnaire_progress(self, questionnaire_name):
        if questionnaire_name in self.current_questionnaire_progress:
            del self.current_questionnaire_progress[questionnaire_name]
        self.save()


class UserQuestionnaireSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='questionnaire_sessions')
    questionnaire = models.ForeignKey(QuestionnaireTemplate, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    current_question_order = models.PositiveIntegerField(default=1)
    is_completed = models.BooleanField(default=False)
    total_score = models.FloatField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        unique_together = ['user', 'questionnaire']
    
    def __str__(self):
        return f"{self.user.email} - {self.questionnaire.name}"


class Answer(models.Model):
    session = models.ForeignKey(UserQuestionnaireSession, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_data = models.JSONField()
    answered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['session', 'question']
    
    def __str__(self):
        return f"{self.session.user.email} - {self.question.text[:30]}"


class UserPreferences(models.Model):
    """
    User preferences model based on healthy ageing AVOID framework:
    A - Age Friendly Environment
    V - Vital Activities  
    O - Optimum Health
    I - Independence
    D - Decision Making
    """
    
    # Core relationship
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # Health conditions (Optimum Health)
    is_diabetic = models.BooleanField(default=False)
    is_hypertensive = models.BooleanField(default=False)
    has_heart_disease = models.BooleanField(default=False)
    has_arthritis = models.BooleanField(default=False)
    has_osteoporosis = models.BooleanField(default=False)
    has_vision_impairment = models.BooleanField(default=False)
    has_hearing_impairment = models.BooleanField(default=False)
    has_memory_concerns = models.BooleanField(default=False)
    other_health_conditions = models.TextField(blank=True, null=True)
    
    # Medication tracking
    takes_medications = models.BooleanField(default=False)
    medication_reminder_enabled = models.BooleanField(default=True)
    medication_reminder_times = models.JSONField(default=list, blank=True, help_text="List of times for medication reminders")
    
    # Physical activity preferences (Vital Activities)
    ACTIVITY_LEVEL_CHOICES = [
        ('sedentary', 'Sedentary'),
        ('lightly_active', 'Lightly Active'),
        ('moderately_active', 'Moderately Active'),
        ('very_active', 'Very Active'),
        ('extremely_active', 'Extremely Active'),
    ]
    activity_level = models.CharField(max_length=20, choices=ACTIVITY_LEVEL_CHOICES, default='lightly_active')
    preferred_exercise_types = models.JSONField(default=list, blank=True, help_text="List of preferred exercise types")
    exercise_goal_minutes_per_week = models.PositiveIntegerField(default=150, help_text="WHO recommended 150 minutes per week")
    
    # Social engagement (Vital Activities)
    SOCIAL_PREFERENCE_CHOICES = [
        ('very_social', 'Very Social'),
        ('moderately_social', 'Moderately Social'),
        ('occasionally_social', 'Occasionally Social'),
        ('prefer_solitude', 'Prefer Solitude'),
    ]
    social_preference = models.CharField(max_length=20, choices=SOCIAL_PREFERENCE_CHOICES, default='moderately_social')
    interested_in_group_activities = models.BooleanField(default=True)
    
    # Mental wellness (Optimum Health)
    STRESS_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
    ]
    stress_level = models.CharField(max_length=10, choices=STRESS_LEVEL_CHOICES, default='moderate')
    interested_in_mindfulness = models.BooleanField(default=True)
    interested_in_meditation = models.BooleanField(default=True)
    
    # Sleep patterns (Optimum Health)
    typical_bedtime = models.TimeField(null=True, blank=True)
    typical_wake_time = models.TimeField(null=True, blank=True)
    sleep_quality_rating = models.IntegerField(default=7, help_text="1-10 scale")
    
    # Nutrition preferences (Optimum Health)
    DIET_TYPE_CHOICES = [
        ('omnivore', 'Omnivore'),
        ('vegetarian', 'Vegetarian'),
        ('vegan', 'Vegan'),
        ('pescatarian', 'Pescatarian'),
        ('mediterranean', 'Mediterranean'),
        ('low_sodium', 'Low Sodium'),
        ('diabetic_friendly', 'Diabetic Friendly'),
        ('other', 'Other'),
    ]
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES, default='omnivore')
    food_allergies = models.TextField(blank=True, null=True)
    water_intake_goal_liters = models.DecimalField(max_digits=3, decimal_places=1, default=2.0)
    
    # Independence and mobility
    MOBILITY_LEVEL_CHOICES = [
        ('fully_mobile', 'Fully Mobile'),
        ('uses_walking_aid', 'Uses Walking Aid'),
        ('wheelchair_user', 'Wheelchair User'),
        ('limited_mobility', 'Limited Mobility'),
    ]
    mobility_level = models.CharField(max_length=20, choices=MOBILITY_LEVEL_CHOICES, default='fully_mobile')
    needs_transportation_assistance = models.BooleanField(default=False)
    
    # Technology comfort (Age Friendly Environment)
    TECH_COMFORT_CHOICES = [
        ('very_comfortable', 'Very Comfortable'),
        ('comfortable', 'Comfortable'),
        ('somewhat_comfortable', 'Somewhat Comfortable'),
        ('needs_assistance', 'Needs Assistance'),
    ]
    tech_comfort_level = models.CharField(max_length=20, choices=TECH_COMFORT_CHOICES, default='comfortable')
    
    # Notification preferences (Decision Making)
    NOTIFICATION_FREQUENCY_CHOICES = [
        ('none', 'None'),
        ('daily', 'Daily'),
        ('twice_daily', 'Twice Daily'),
        ('three_times_daily', 'Three Times Daily'),
        ('hourly', 'Hourly'),
    ]
    notification_frequency = models.CharField(max_length=20, choices=NOTIFICATION_FREQUENCY_CHOICES, default='daily')
    
    NOTIFICATION_TIME_CHOICES = [
        ('morning', 'Morning (6 AM - 12 PM)'),
        ('afternoon', 'Afternoon (12 PM - 6 PM)'),
        ('evening', 'Evening (6 PM - 10 PM)'),
        ('flexible', 'Flexible'),
    ]
    notification_time_preference = models.CharField(max_length=15, choices=NOTIFICATION_TIME_CHOICES, default='morning')
    
    # Personality and motivation (Decision Making)
    PERSONALITY_TYPE_CHOICES = [
        ('achiever', 'Achiever'),
        ('explorer', 'Explorer'),
        ('socializer', 'Socializer'),
        ('competitor', 'Competitor'),
    ]
    personality_type = models.CharField(max_length=15, choices=PERSONALITY_TYPE_CHOICES, null=True, blank=True)
    
    MOTIVATION_TYPE_CHOICES = [
        ('intrinsic', 'Intrinsic (Personal satisfaction)'),
        ('extrinsic', 'Extrinsic (External rewards)'),
        ('social', 'Social (Community support)'),
        ('competitive', 'Competitive (Comparison with others)'),
    ]
    motivation_type = models.CharField(max_length=15, choices=MOTIVATION_TYPE_CHOICES, default='intrinsic')
    
    # Goal preferences
    prefers_short_term_goals = models.BooleanField(default=True)
    prefers_long_term_goals = models.BooleanField(default=False)
    goal_reminder_enabled = models.BooleanField(default=True)
    
    # Emergency and safety
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True, null=True)
    
    # Individual date tracking for each preference field
    # Health conditions dates
    is_diabetic_updated_at = models.DateTimeField(null=True, blank=True)
    is_hypertensive_updated_at = models.DateTimeField(null=True, blank=True)
    has_heart_disease_updated_at = models.DateTimeField(null=True, blank=True)
    has_arthritis_updated_at = models.DateTimeField(null=True, blank=True)
    has_osteoporosis_updated_at = models.DateTimeField(null=True, blank=True)
    has_vision_impairment_updated_at = models.DateTimeField(null=True, blank=True)
    has_hearing_impairment_updated_at = models.DateTimeField(null=True, blank=True)
    has_memory_concerns_updated_at = models.DateTimeField(null=True, blank=True)
    other_health_conditions_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Medication dates
    takes_medications_updated_at = models.DateTimeField(null=True, blank=True)
    medication_reminder_enabled_updated_at = models.DateTimeField(null=True, blank=True)
    medication_reminder_times_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Activity dates
    activity_level_updated_at = models.DateTimeField(null=True, blank=True)
    preferred_exercise_types_updated_at = models.DateTimeField(null=True, blank=True)
    exercise_goal_minutes_per_week_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Social dates
    social_preference_updated_at = models.DateTimeField(null=True, blank=True)
    interested_in_group_activities_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Mental wellness dates
    stress_level_updated_at = models.DateTimeField(null=True, blank=True)
    interested_in_mindfulness_updated_at = models.DateTimeField(null=True, blank=True)
    interested_in_meditation_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Sleep dates
    typical_bedtime_updated_at = models.DateTimeField(null=True, blank=True)
    typical_wake_time_updated_at = models.DateTimeField(null=True, blank=True)
    sleep_quality_rating_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Nutrition dates
    diet_type_updated_at = models.DateTimeField(null=True, blank=True)
    food_allergies_updated_at = models.DateTimeField(null=True, blank=True)
    water_intake_goal_liters_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Mobility dates
    mobility_level_updated_at = models.DateTimeField(null=True, blank=True)
    needs_transportation_assistance_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Technology dates
    tech_comfort_level_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Notification dates
    notification_frequency_updated_at = models.DateTimeField(null=True, blank=True)
    notification_time_preference_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Personality dates
    personality_type_updated_at = models.DateTimeField(null=True, blank=True)
    motivation_type_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Goal dates
    prefers_short_term_goals_updated_at = models.DateTimeField(null=True, blank=True)
    prefers_long_term_goals_updated_at = models.DateTimeField(null=True, blank=True)
    goal_reminder_enabled_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Emergency contact dates
    emergency_contact_name_updated_at = models.DateTimeField(null=True, blank=True)
    emergency_contact_phone_updated_at = models.DateTimeField(null=True, blank=True)
    emergency_contact_relationship_updated_at = models.DateTimeField(null=True, blank=True)
    
    # General timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    
    class Meta:
        verbose_name = "User Preferences"
        verbose_name_plural = "User Preferences"
    
    def __str__(self):
        return f"{self.user.email} - Preferences"
    
    def get_health_risk_factors(self):
        """Return a list of health risk factors based on conditions"""
        risk_factors = []
        if self.is_diabetic:
            risk_factors.append('diabetes')
        if self.is_hypertensive:
            risk_factors.append('hypertension')
        if self.has_heart_disease:
            risk_factors.append('heart_disease')
        if self.has_arthritis:
            risk_factors.append('arthritis')
        if self.has_osteoporosis:
            risk_factors.append('osteoporosis')
        return risk_factors
    
    def get_recommended_exercise_duration(self):
        """Return recommended exercise duration based on activity level and health conditions"""
        base_minutes = self.exercise_goal_minutes_per_week
        
        # Adjust based on health conditions
        if self.has_heart_disease or self.has_arthritis:
            base_minutes = min(base_minutes, 120)  # Cap at 120 minutes for certain conditions
        
        return base_minutes
    
    def is_high_risk_user(self):
        """Determine if user is considered high risk based on health conditions"""
        high_risk_conditions = [
            self.is_diabetic,
            self.is_hypertensive,
            self.has_heart_disease,
            self.has_memory_concerns
        ]
        return any(high_risk_conditions)
    
    def update_individual_timestamps(self, updated_fields):
        """Update the individual timestamp for each field that was updated"""
        from django.utils import timezone
        
        now = timezone.now()
        
        # Update individual field timestamps
        for field_name in updated_fields:
            timestamp_field = f"{field_name}_updated_at"
            if hasattr(self, timestamp_field):
                setattr(self, timestamp_field, now)


class ForestConfiguration(models.Model):
    """
    Model to store forest/gamification configuration settings.
    Single source of truth for all forest rules.
    """
    # Tree progression settings
    points_per_achievement = models.IntegerField(default=25, help_text="Points awarded per completed goal/achievement")
    points_per_stage = models.IntegerField(default=50, help_text="Points required per tree stage (seed/sprout/sapling/tree)")
    stages_per_tree = models.IntegerField(default=4, help_text="Number of stages per complete tree")
    
    # Calculated properties (automatically computed from above)
    @property
    def points_per_tree(self):
        """Total points required to complete one tree"""
        return self.points_per_stage * self.stages_per_tree
    
    # Categories and their display information
    category_mappings = models.JSONField(default=dict, help_text="Mapping of goal categories to display info")
    
    # Tree stage definitions
    stage_definitions = models.JSONField(default=dict, help_text="Definition of each tree stage")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, help_text="Whether this configuration is currently active")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Forest Configuration"
        verbose_name_plural = "Forest Configurations"
    
    def __str__(self):
        return f"Forest Config - {self.points_per_achievement}pts/achievement, {self.points_per_stage}pts/stage"
    
    @classmethod
    def get_active_config(cls):
        """Get the currently active forest configuration"""
        config = cls.objects.filter(is_active=True).first()
        if not config:
            # Create default configuration if none exists
            config = cls.objects.create(
                points_per_achievement=25,
                points_per_stage=50,
                stages_per_tree=4,
                category_mappings={
                    'mind': {
                        'display_name': 'Mindfulness',
                        'quality': 'Peace',
                        'color': '#6B73FF',
                        'icon': 'meditation',
                        'emoji': '🧘'
                    },
                    'social': {
                        'display_name': 'Social Connection',
                        'quality': 'Connection',
                        'color': '#2196F3',
                        'icon': 'account-group',
                        'emoji': '👥'
                    },
                    'nutrition': {
                        'display_name': 'Diet & Nutrition',
                        'quality': 'Nourishment',
                        'color': '#FF9800',
                        'icon': 'food-apple',
                        'emoji': '🍎'
                    },
                    'activity': {
                        'display_name': 'Activity',
                        'quality': 'Vitality',
                        'color': '#4CAF50',
                        'icon': 'run',
                        'emoji': '🏃'
                    }
                },
                stage_definitions={
                    'seed': {
                        'name': 'Seed',
                        'label': 'Planting...',
                        'icon': 'seed'
                    },
                    'sprout': {
                        'name': 'Sprout',
                        'label': 'Growing Sprout...',
                        'icon': 'sprout'
                    },
                    'sapling': {
                        'name': 'Sapling',
                        'label': 'Nurturing Sapling...',
                        'icon': 'tree-outline'
                    },
                    'tree': {
                        'name': 'Tree',
                        'label': 'Flourishing Tree...',
                        'icon': 'tree'
                    }
                },
                is_active=True
            )
        return config


class Tree(models.Model):
    """
    Model to track individual trees completed by users.
    Each tree represents a complete growth cycle (80 points).
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trees')
    tree_number = models.IntegerField(help_text="Sequential number of this tree for the user")
    completed_at = models.DateTimeField(auto_now_add=True)
    
    # Track which goals contributed to this tree
    mindfulness_count = models.IntegerField(default=0, help_text="Mindfulness goals completed for this tree")
    social_count = models.IntegerField(default=0, help_text="Social goals completed for this tree")
    nutrition_count = models.IntegerField(default=0, help_text="Nutrition goals completed for this tree")
    medications_count = models.IntegerField(default=0, help_text="Medications taken for this tree")
    activity_count = models.IntegerField(default=0, help_text="Activity goals completed for this tree")
    
    # Total points that led to this tree
    total_points = models.IntegerField(default=80, help_text="Total points accumulated for this tree")
    
    class Meta:
        ordering = ['-completed_at']
        unique_together = ['user', 'tree_number']
    
    def __str__(self):
        return f"{self.user.email} - Tree #{self.tree_number} (Completed: {self.completed_at.date()})"
    
    def get_total_goals(self):
        """Get total number of goals completed for this tree"""
        return (self.mindfulness_count + self.social_count + 
                self.nutrition_count + self.medications_count + 
                self.activity_count)


class ForestProgress(models.Model):
    """
    Model to track user's forest/gamification progress including points,
    achievements, and tree growth cycles. Integrates with tracking app's
    Goal and Medication models.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='forest_progress')
    
    # Points system
    points = models.IntegerField(default=0, help_text="Total points earned by the user")
    
    # Points configuration (now dynamic from ForestConfiguration)
    # Removed hardcoded points_per_tree - will be calculated from ForestConfiguration
    
    # Tree progress tracking
    current_cycle_points = models.IntegerField(default=0, help_text="Points in current tree growth cycle")
    completed_trees = models.IntegerField(default=0, help_text="Total number of trees completed")
    
    # Track contributions to current tree (reset when tree completes)
    current_tree_mindfulness = models.IntegerField(default=0, help_text="Mindfulness goals for current tree")
    current_tree_social = models.IntegerField(default=0, help_text="Social goals for current tree")
    current_tree_nutrition = models.IntegerField(default=0, help_text="Nutrition goals for current tree")
    current_tree_medications = models.IntegerField(default=0, help_text="Medications for current tree")
    current_tree_activity = models.IntegerField(default=0, help_text="Activity goals for current tree")
    
    # Overall achievement counters (total count of completed goals/medications by category)
    total_mindfulness = models.IntegerField(default=0, help_text="Total mindfulness/mind goals completed")
    total_social_connection = models.IntegerField(default=0, help_text="Total social connection goals completed")
    total_nutrition = models.IntegerField(default=0, help_text="Total nutrition goals completed")
    total_medications = models.IntegerField(default=0, help_text="Total medications taken")
    total_activity = models.IntegerField(default=0, help_text="Total activity goals completed")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Forest Progress"
        verbose_name_plural = "Forest Progress"
    
    def __str__(self):
        return f"{self.user.email} - Forest Progress (Points: {self.points}, Trees: {self.completed_trees})"
    
    def add_points(self, amount, category=None):
        """
        Add points and check for tree completion.
        category can be: 'mindfulness', 'social', 'nutrition', 'medications', 'activity'
        """
        # Get current forest configuration
        config = ForestConfiguration.get_active_config()
        
        self.points += amount
        self.current_cycle_points += amount
        
        # Track category contribution to current tree
        if category:
            if category == 'mindfulness':
                self.current_tree_mindfulness += 1
            elif category == 'social':
                self.current_tree_social += 1
            elif category == 'nutrition':
                self.current_tree_nutrition += 1
            elif category == 'medications':
                self.current_tree_medications += 1
            elif category == 'activity':
                self.current_tree_activity += 1
        
        # Check if a tree is completed (properly reset points for next cycle)
        points_per_tree = config.points_per_tree
        while self.current_cycle_points >= points_per_tree:
            self.completed_trees += 1
            
            # Create a Tree record for the completed tree
            Tree.objects.create(
                user=self.user,
                tree_number=self.completed_trees,
                mindfulness_count=self.current_tree_mindfulness,
                social_count=self.current_tree_social,
                nutrition_count=self.current_tree_nutrition,
                medications_count=self.current_tree_medications,
                activity_count=self.current_tree_activity,
                total_points=points_per_tree
            )
            
            # Reset current tree tracking
            self.current_tree_mindfulness = 0
            self.current_tree_social = 0
            self.current_tree_nutrition = 0
            self.current_tree_medications = 0
            self.current_tree_activity = 0
            
            # Reset cycle points
            self.current_cycle_points = self.current_cycle_points - points_per_tree
        
        self.save()
    
    def get_daily_goals_status(self, date=None):
        """
        Get daily goals completion status for a specific date
        by checking GoalCompleted and MedicationTaken records
        """
        from django.utils import timezone
        from tracking.models import GoalCompleted, MedicationTaken, GoalCategory
        
        if date is None:
            date = timezone.now().date()
        
        # Check each category's completion status for today
        daily_status = {
            'mindfulness': False,
            'socialConnection': False,
            'nutrition': False,
            'medications': False,
            'activity': False,
        }
        
        # Check mindfulness/mind goals
        mind_completed = GoalCompleted.objects.filter(
            user=self.user,
            date_completed=date,
            goal__category=GoalCategory.MIND
        ).exists()
        daily_status['mindfulness'] = mind_completed
        
        # Check social goals
        social_completed = GoalCompleted.objects.filter(
            user=self.user,
            date_completed=date,
            goal__category=GoalCategory.SOCIAL
        ).exists()
        daily_status['socialConnection'] = social_completed
        
        # Check nutrition goals
        nutrition_completed = GoalCompleted.objects.filter(
            user=self.user,
            date_completed=date,
            goal__category=GoalCategory.NUTRITION
        ).exists()
        daily_status['nutrition'] = nutrition_completed
        
        # Check activity goals
        activity_completed = GoalCompleted.objects.filter(
            user=self.user,
            date_completed=date,
            goal__category=GoalCategory.ACTIVITY
        ).exists()
        daily_status['activity'] = activity_completed
        
        # Check if any medications were taken today
        medications_taken = MedicationTaken.objects.filter(
            user=self.user,
            date_taken=date
        ).exists()
        daily_status['medications'] = medications_taken
        
        return daily_status
    
    def update_achievement_totals(self):
        """
        Update the total achievement counters based on all completed goals and medications
        """
        from tracking.models import GoalCompleted, MedicationTaken, GoalCategory
        
        # Count mindfulness/mind goals
        self.total_mindfulness = GoalCompleted.objects.filter(
            user=self.user,
            goal__category=GoalCategory.MIND
        ).count()
        
        # Count social goals
        self.total_social_connection = GoalCompleted.objects.filter(
            user=self.user,
            goal__category=GoalCategory.SOCIAL
        ).count()
        
        # Count nutrition goals
        self.total_nutrition = GoalCompleted.objects.filter(
            user=self.user,
            goal__category=GoalCategory.NUTRITION
        ).count()
        
        # Count activity goals
        self.total_activity = GoalCompleted.objects.filter(
            user=self.user,
            goal__category=GoalCategory.ACTIVITY
        ).count()
        
        # Count medications taken
        self.total_medications = MedicationTaken.objects.filter(
            user=self.user
        ).count()
        
        # Get current forest configuration
        config = ForestConfiguration.get_active_config()
        
        # Calculate total points from all achievements
        total_achievements = (
            self.total_mindfulness + 
            self.total_social_connection + 
            self.total_nutrition + 
            self.total_activity + 
            self.total_medications
        )
        self.points = total_achievements * config.points_per_achievement
        
        # Update tree progress with proper cycle reset
        points_per_tree = config.points_per_tree
        self.completed_trees = self.points // points_per_tree
        self.current_cycle_points = self.points % points_per_tree
        
        self.save()


# Import signals at the end to avoid circular imports
from django.db.models.signals import post_save
from django.dispatch import receiver


# Signal to automatically create UserPreferences and ForestProgress when a user is created
@receiver(post_save, sender=User)
def create_user_preferences(sender, instance, created, **kwargs):
    """Create default UserPreferences and ForestProgress when a new user is created"""
    if created:
        # Create default preferences
        UserPreferences.objects.get_or_create(
            user=instance,
            defaults={}
        )
        
        # Create forest progress
        ForestProgress.objects.get_or_create(
            user=instance,
            defaults={}
        )
