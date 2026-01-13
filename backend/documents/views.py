import time
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Document, DocumentSearchHistory
from .serializers import (
    DocumentUploadSerializer, DocumentSerializer, DocumentSearchSerializer,
    DocumentSearchResultSerializer, DocumentSearchHistorySerializer
)
from .services import DocumentService


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request):
    """
    Upload and process a PDF file.
    Extracts text, chunks it, and stores in ChromaDB.
    """
    serializer = DocumentUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    file_content = serializer.validated_data['file_content']
    filename = serializer.validated_data['filename']
    
    # Check if document already exists for this user - if so, delete the old one
    existing_document = Document.objects.filter(user=request.user, filename=filename).first()
    if existing_document:
        # Delete old chunks from ChromaDB and S3
        document_service = DocumentService()
        document_service.delete_document(request.user.id, filename, existing_document.s3_object_key)
        
        # Delete the database record
        existing_document.delete()
    
    try:
        # Process the document
        document_service = DocumentService()
        result = document_service.process_pdf_file(
            user_id=request.user.id,
            file_content=file_content,
            filename=filename,
            content_type="base64"
        )
        
        # Calculate file size from base64 content
        import base64
        file_size = len(base64.b64decode(file_content))
        
        # Save document metadata to database
        document = Document.objects.create(
            user=request.user,
            filename=filename,
            file_size=file_size,
            processed_at=timezone.now(),
            chunks_count=result['chunks_created'],
            extracted_text_length=result['extracted_text_length'],
            page_count=result['page_count'],
            chroma_collection_name=f"user_{request.user.id}_documents",
            s3_object_key=result.get('s3_object_key')
        )
        
        return Response({
            'message': 'PDF document processed successfully',
            'document_id': document.id,
            'processing_result': result
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Error processing PDF document: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_documents(request):
    """List all documents for the authenticated user."""
    documents = Document.objects.filter(user=request.user)
    
    paginator = StandardResultsSetPagination()
    paginated_documents = paginator.paginate_queryset(documents, request)
    
    serializer = DocumentSerializer(paginated_documents, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, document_id):
    """Delete a document and its associated data from ChromaDB."""
    try:
        document = Document.objects.get(id=document_id, user=request.user)
    except Document.DoesNotExist:
        return Response(
            {'error': 'Document not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        # Delete document chunks from ChromaDB and file from S3
        document_service = DocumentService()
        document_service.delete_document(request.user.id, document.filename, document.s3_object_key)
        
        # Delete the database record
        document.delete()
        
        return Response(
            {'message': 'Document deleted successfully'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        return Response(
            {'error': f'Error deleting document: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_document(request, document_id):
    """Get a presigned URL for downloading a document."""
    try:
        document = Document.objects.get(id=document_id, user=request.user)
    except Document.DoesNotExist:
        return Response(
            {'error': 'Document not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if not document.s3_object_key:
        return Response(
            {'error': 'Document file not available for download'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        document_service = DocumentService()
        download_url = document_service.get_document_download_url(document.s3_object_key)
        
        return Response({
            'download_url': download_url,
            'filename': document.filename,
            'expires_in': 3600  # 1 hour
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error generating download URL: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_documents(request):
    """Search through user's documents using ChromaDB."""
    serializer = DocumentSearchSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    query = serializer.validated_data['query']
    n_results = serializer.validated_data['n_results']
    
    try:
        start_time = time.time()
        
        # Perform search
        document_service = DocumentService()
        search_results = document_service.search_user_documents(
            user_id=request.user.id,
            query=query,
            n_results=n_results
        )
        
        search_time = time.time() - start_time
        
        # Save search history
        DocumentSearchHistory.objects.create(
            user=request.user,
            query=query,
            results_count=len(search_results.get('results', {}).get('documents', []))
        )
        
        # Prepare response
        response_data = {
            'query': query,
            'results': search_results['results'],
            'search_time': search_time
        }
        
        result_serializer = DocumentSearchResultSerializer(data=response_data)
        if result_serializer.is_valid():
            return Response(result_serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(search_results, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error searching documents: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_history(request):
    """Get search history for the authenticated user."""
    history = DocumentSearchHistory.objects.filter(user=request.user)
    
    paginator = StandardResultsSetPagination()
    paginated_history = paginator.paginate_queryset(history, request)
    
    serializer = DocumentSearchHistorySerializer(paginated_history, many=True)
    return paginator.get_paginated_response(serializer.data)
