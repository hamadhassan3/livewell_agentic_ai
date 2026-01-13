from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GoalViewSet, MedicationViewSet, MedicationTakenViewSet, GoalCompletedViewSet, SerpApiSearch, EventViewSet, StepCountViewSet

router = DefaultRouter()
router.register(r'goals', GoalViewSet, basename='goal')
router.register(r'medications', MedicationViewSet, basename='medication')
router.register(r'medication-taken', MedicationTakenViewSet, basename='medication-taken')
router.register(r'goal-completed', GoalCompletedViewSet, basename='goal-completed')
router.register(r'search-events', SerpApiSearch, basename='search-events')
router.register(r'events', EventViewSet, basename='event')
router.register(r'step-counts', StepCountViewSet, basename='step-count')

urlpatterns = [
    path("", include(router.urls)),
]