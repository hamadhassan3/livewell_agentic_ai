import firebase_admin
from firebase_admin import credentials, messaging
import os
import json
from typing import Optional, Dict, List
from django.contrib.auth import get_user_model

User = get_user_model()


class FirebaseService:
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        self._firebase_available = None
    
    def _ensure_initialized(self):
        if not self._initialized:
            self._initialize_firebase()
            self._initialized = True
        
        if self._firebase_available is False:
            raise ValueError("Firebase is not configured. Please set up Firebase service account credentials.")
    
    def _initialize_firebase(self):
        try:
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            print(f"DEBUG: FIREBASE_SERVICE_ACCOUNT_PATH = {service_account_path}")
            
            if service_account_path and os.path.exists(service_account_path):
                print(f"DEBUG: Service account file found at {service_account_path}")
                cred = credentials.Certificate(service_account_path)
            else:
                print(f"DEBUG: Service account file not found, trying JSON env var")
                service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT')
                if service_account_json:
                    print("DEBUG: Found FIREBASE_SERVICE_ACCOUNT env var")
                    service_account_data = json.loads(service_account_json)
                    cred = credentials.Certificate(service_account_data)
                else:
                    print("DEBUG: No Firebase credentials found")
                    self._firebase_available = False
                    return
            
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
                print("DEBUG: Firebase app initialized successfully")
                
            self._firebase_available = True
            print("DEBUG: Firebase service available")
        except Exception as e:
            print(f"DEBUG: Firebase initialization failed: {str(e)}")
            self._firebase_available = False
    
    def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> str:
        self._ensure_initialized()
        try:
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            message = messaging.Message(
                notification=notification,
                data=data or {},
                token=token
            )
            
            message_id = messaging.send(message)
            
            # Save notification to database
            if user_id:
                self._save_notification_to_db(
                    user_id=user_id,
                    title=title,
                    body=body,
                    data=data or {},
                    image_url=image_url,
                    fcm_message_id=message_id,
                    status='sent'
                )
            
            return message_id
        except Exception as e:
            # Save failed notification to database
            if user_id:
                self._save_notification_to_db(
                    user_id=user_id,
                    title=title,
                    body=body,
                    data=data or {},
                    image_url=image_url,
                    status='failed'
                )
            raise
    
    def send_multicast_notification(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None,
        user_ids: Optional[List[int]] = None
    ) -> messaging.BatchResponse:
        self._ensure_initialized()
        try:
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            message = messaging.MulticastMessage(
                notification=notification,
                data=data or {},
                tokens=tokens
            )
            
            response = messaging.send_multicast(message)
            
            # Save notifications to database
            if user_ids:
                for i, user_id in enumerate(user_ids):
                    if i < len(response.responses):
                        fcm_response = response.responses[i]
                        status = 'sent' if fcm_response.success else 'failed'
                        message_id = fcm_response.message_id if fcm_response.success else None
                        
                        self._save_notification_to_db(
                            user_id=user_id,
                            title=title,
                            body=body,
                            data=data or {},
                            image_url=image_url,
                            fcm_message_id=message_id,
                            status=status
                        )
            
            return response
        except Exception as e:
            # Save failed notifications to database
            if user_ids:
                for user_id in user_ids:
                    self._save_notification_to_db(
                        user_id=user_id,
                        title=title,
                        body=body,
                        data=data or {},
                        image_url=image_url,
                        status='failed'
                    )
            raise
    
    def _save_notification_to_db(
        self,
        user_id: int,
        title: str,
        body: str,
        data: Dict[str, str],
        image_url: Optional[str] = None,
        fcm_message_id: Optional[str] = None,
        status: str = 'sent'
    ):
        """Save notification to database"""
        try:
            from .models import Notification
            
            user = User.objects.get(id=user_id)
            Notification.objects.create(
                recipient=user,
                title=title,
                body=body,
                data=data,
                image_url=image_url,
                fcm_message_id=fcm_message_id,
                status=status
            )
        except User.DoesNotExist:
            pass  # User not found, skip saving
        except Exception:
            pass  # Don't let database errors affect notification sending


firebase_service = FirebaseService()