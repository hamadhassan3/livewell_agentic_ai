"""
URL configuration for livewell project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Schema endpoint
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    
    # Swagger UI
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # ReDoc UI
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),


    path('admin/', admin.site.urls),

    # Include the agent app URLs
    path('agent/', include('agent.urls')),

    # Include the profiles app URLs
    path("profiles/", include("profiles.urls")),

    # Include the tracking app URLs
    path("tracking/", include("tracking.urls")),
    
    # Include the tools app URLs
    path("tools/", include("tools.urls")),
    
    # Include the notification app URLs
    path("notifications/", include("notification.urls")),
    
    # Include the documents app URLs
    path("documents/", include("documents.urls")),
]
