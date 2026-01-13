from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_document, name='upload_document'),
    path('list/', views.list_documents, name='list_documents'),
    path('<int:document_id>/delete/', views.delete_document, name='delete_document'),
    path('<int:document_id>/download/', views.download_document, name='download_document'),
    path('search/', views.search_documents, name='search_documents'),
    path('search-history/', views.search_history, name='search_history'),
]