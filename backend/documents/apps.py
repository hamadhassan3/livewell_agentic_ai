from django.apps import AppConfig
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)


class DocumentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'documents'
    
    def ready(self):
        """
        Called when Django starts. Auto-loads global documents from the docs folder.
        """
        import sys
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0] if sys.argv else False:
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                
                call_command('load_global_documents')
                
                # Warm up ChromaDB embedding model to avoid delay on first query
                try:
                    from documents.services import DocumentService
                    doc_service = DocumentService()
                    # Dummy search to trigger model download
                    doc_service.search_global_documents("health", n_results=1)
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"Could not auto-load global documents: {e}")
