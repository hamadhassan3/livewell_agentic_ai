from django.urls import path
from .views import (
    RegisterView, get_current_question, submit_answer, UserProfileView, GoogleAuthView, LeaderboardView,
    UserPreferencesView, ForestDataView, UserTreesView, ForestConfigurationView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),

    # JWT token endpoints
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # OAuth endpoints
    path("auth/google/", GoogleAuthView.as_view(), name="google_auth"),

    # Profile endpoints
    path("profile/", UserProfileView.as_view(), name="user_profile"),

    # Leaderboard endpoints
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),

    # Questionnaire endpoints
    path("questionnaire/<str:questionnaire_name>/question/", get_current_question, name="get_current_question"),
    path("questionnaire/answer/", submit_answer, name="submit_answer"),
    
    # User Preferences endpoints
    path("preferences/", UserPreferencesView.as_view(), name="user_preferences"),
    
    # Forest/Gamification endpoints
    path("forest/data/", ForestDataView.as_view(), name="forest_data"),
    path("forest/trees/", UserTreesView.as_view(), name="user_trees"),
    path("forest/config/", ForestConfigurationView.as_view(), name="forest_config"),
]
