"""Document processing services for ChromaDB integration."""
import os
import uuid
import base64
import io
from typing import List, Dict, Any
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError
from chromadb import HttpClient
from django.contrib.auth import get_user_model

User = get_user_model()


class S3Service:
    """Service for managing AWS S3 operations."""

    def __init__(self):
        self.aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('AWS_S3_BUCKET_NAME')
        self.region = os.getenv('AWS_S3_REGION', 'us-east-1')
        
        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.bucket_name]):
            raise ValueError("AWS S3 credentials and bucket name must be configured in environment variables")
        
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.region
        )

    def upload_file(self, file_content: str, user_id: int, filename: str, content_type: str = "base64") -> str:
        """
        Upload a file to S3 and return the object key.
        
        Args:
            file_content: File content (base64 encoded or bytes)
            user_id: User identifier
            filename: Original filename
            content_type: Type of content ("base64" or "bytes")
            
        Returns:
            S3 object key
        """
        try:
            # Generate unique object key
            file_extension = os.path.splitext(filename)[1]
            object_key = f"documents/user_{user_id}/{uuid.uuid4().hex}{file_extension}"
            
            # Prepare file content for upload
            if content_type == "base64":
                file_bytes = base64.b64decode(file_content)
            else:
                file_bytes = file_content
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_bytes,
                ContentType='application/pdf' if filename.lower().endswith('.pdf') else 'application/octet-stream',
                Metadata={
                    'original_filename': filename,
                    'user_id': str(user_id)
                }
            )
            
            return object_key
            
        except ClientError as e:
            raise Exception(f"Failed to upload file to S3: {str(e)}")

    def get_presigned_url(self, object_key: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL for downloading a file from S3.
        
        Args:
            object_key: S3 object key
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Presigned URL
        """
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': object_key},
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            raise Exception(f"Failed to generate presigned URL: {str(e)}")

    def delete_file(self, object_key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            object_key: S3 object key
            
        Returns:
            True if deletion was successful
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except ClientError as e:
            print(f"Failed to delete file from S3: {str(e)}")
            return False

    def file_exists(self, object_key: str) -> bool:
        """
        Check if a file exists in S3.
        
        Args:
            object_key: S3 object key
            
        Returns:
            True if file exists
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except ClientError:
            return False


class ChromaDBService:
    """Service for managing ChromaDB operations."""

    def __init__(self):
        chroma_host = os.getenv('CHROMA_HOST', 'localhost')
        chroma_port = int(os.getenv('CHROMA_PORT', '8000'))
        self.client = HttpClient(host=chroma_host, port=chroma_port)

    def get_user_collection_name(self, user_id: int) -> str:
        """Generate a unique collection name for each user."""
        return f"user_{user_id}_documents"
    
    def get_global_collection_name(self) -> str:
        """Get the collection name for global documents."""
        return "global_documents"

    def get_or_create_collection(self, user_id: int):
        """Get or create a collection for a specific user."""
        collection_name = self.get_user_collection_name(user_id)
        try:
            collection = self.client.get_collection(name=collection_name)
        except Exception:  # pylint: disable=broad-except
            collection = self.client.create_collection(name=collection_name)
        return collection
    
    def get_or_create_global_collection(self):
        """Get or create the global documents collection."""
        collection_name = self.get_global_collection_name()
        try:
            collection = self.client.get_collection(name=collection_name)
        except Exception:  # pylint: disable=broad-except
            collection = self.client.create_collection(name=collection_name)
        return collection

    def add_document_chunks(self, user_id: int, document_name: str,
                          chunks: List[str]) -> Dict[str, Any]:
        """Add document chunks to user's collection."""
        collection = self.get_or_create_collection(user_id)

        documents = []
        metadatas = []
        ids = []

        for i, chunk in enumerate(chunks):
            doc_id = f"{document_name}_{i}_{uuid.uuid4().hex[:8]}"
            documents.append(chunk)
            metadatas.append({
                "document_name": document_name,
                "chunk_index": i,
                "user_id": user_id,
                "total_chunks": len(chunks)
            })
            ids.append(doc_id)

        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

        return {
            "document_name": document_name,
            "chunks_added": len(chunks),
            "collection_name": collection.name
        }

    def search_documents(self, user_id: int, query: str,
                        n_results: int = 5) -> Dict[str, Any]:
        """Search documents in user's collection."""
        collection = self.get_or_create_collection(user_id)

        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )

        return {
            "query": query,
            "results": results
        }
    
    def add_global_document_chunks(self, document_name: str, chunks: List[str]) -> Dict[str, Any]:
        """Add global document chunks to the global collection."""
        collection = self.get_or_create_global_collection()

        documents = []
        metadatas = []
        ids = []

        for i, chunk in enumerate(chunks):
            doc_id = f"global_{document_name}_{i}_{uuid.uuid4().hex[:8]}"
            documents.append(chunk)
            metadatas.append({
                "document_name": document_name,
                "chunk_index": i,
                "document_type": "global",
                "total_chunks": len(chunks)
            })
            ids.append(doc_id)

        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

        return {
            "document_name": document_name,
            "chunks_added": len(chunks),
            "collection_name": collection.name
        }
    
    def search_global_documents(self, query: str, n_results: int = 5) -> Dict[str, Any]:
        """Search global documents."""
        collection = self.get_or_create_global_collection()

        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )

        return {
            "query": query,
            "results": results
        }
    
    def delete_global_document_chunks(self, document_name: str) -> bool:
        """Delete all chunks for a specific global document."""
        try:
            collection = self.get_or_create_global_collection()
            
            # Get all items in the collection to filter by document_name
            all_items = collection.get()
            
            # Find IDs of chunks that match the document name
            ids_to_delete = []
            if all_items and 'metadatas' in all_items and 'ids' in all_items:
                for item_id, metadata in zip(all_items['ids'], all_items['metadatas']):
                    if metadata.get('document_name') == document_name:
                        ids_to_delete.append(item_id)
            
            # Delete the matching chunks
            if ids_to_delete:
                collection.delete(ids=ids_to_delete)
                return True
            else:
                return False
                
        except Exception:
            return False

    def delete_document_chunks(self, user_id: int, document_name: str) -> bool:
        """Delete all chunks for a specific document from user's collection."""
        try:
            collection = self.get_or_create_collection(user_id)
            
            # Get all items in the collection to filter by document_name
            all_items = collection.get()
            
            # Find IDs of chunks that match the document name
            ids_to_delete = []
            if all_items and 'metadatas' in all_items and 'ids' in all_items:
                for item_id, metadata in zip(all_items['ids'], all_items['metadatas']):
                    if metadata.get('document_name') == document_name:
                        ids_to_delete.append(item_id)
            
            # Delete the matching chunks
            if ids_to_delete:
                collection.delete(ids=ids_to_delete)
                return True
            else:
                return False
                
        except Exception:
            return False


class PDFProcessor:
    """Processor for extracting and chunking text from PDF files."""

    @staticmethod
    def clean_pdf_text(text: str) -> str:
        """Clean up PDF extracted text by removing excessive whitespace."""
        import re
        
        # Replace multiple spaces/newlines with single spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common PDF extraction issues
        text = re.sub(r'\s*\n\s*', '\n', text)  # Clean up line breaks
        text = re.sub(r'([a-z])\s+([A-Z])', r'\1 \2', text)  # Fix word spacing
        
        # Remove excessive spacing around punctuation
        text = re.sub(r'\s*([.,;:!?])\s*', r'\1 ', text)
        
        # Clean up bullet points and formatting
        text = re.sub(r'\s*●\s*', '\n• ', text)
        text = re.sub(r'\s*\|\s*', ' | ', text)
        
        return text.strip()

    @staticmethod
    def extract_text_from_pdf_base64(base64_content: str) -> Dict[str, Any]:
        """
        Extract text from a base64 encoded PDF file.
        
        Args:
            base64_content: Base64 encoded PDF content
            
        Returns:
            Dictionary containing extracted text and page count
        """
        try:
            # Try to import PyPDF2 first, fall back to basic extraction
            try:
                import PyPDF2
                
                # Decode base64 content
                pdf_bytes = base64.b64decode(base64_content)
                pdf_file = io.BytesIO(pdf_bytes)
                
                # Create PDF reader
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                
                # Extract text from all pages
                extracted_text = []
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text().strip()
                    if page_text:
                        # Clean up the text - remove excessive whitespace and normalize spacing
                        cleaned_text = PDFProcessor.clean_pdf_text(page_text)
                        extracted_text.append(f"[Page {page_num + 1}]\n{cleaned_text}")
                
                full_text = "\n\n".join(extracted_text)
                page_count = len(pdf_reader.pages)
                
                return {
                    "text": full_text,
                    "page_count": page_count,
                    "extraction_method": "PyPDF2"
                }
                
            except ImportError:
                # Fallback: Use Django's Read tool capability for basic PDF processing
                # This is a simplified approach - in production you'd want proper PDF libraries
                pdf_bytes = base64.b64decode(base64_content)
                
                # Basic text extraction attempt (limited functionality)
                text_content = "PDF content extracted (basic extraction method used - install PyPDF2 for better results)"
                
                return {
                    "text": text_content,
                    "page_count": 1,
                    "extraction_method": "basic"
                }
                
        except Exception as e:
            # If all else fails, return error info
            return {
                "text": f"Error extracting PDF content: {str(e)}",
                "page_count": 0,
                "extraction_method": "error",
                "error": str(e)
            }

    @staticmethod
    def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract text from PDF bytes.
        
        Args:
            pdf_bytes: Raw PDF file bytes
            
        Returns:
            Dictionary containing extracted text and page count
        """
        try:
            # Try to import PyPDF2 first
            try:
                import PyPDF2
                
                pdf_file = io.BytesIO(pdf_bytes)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                
                # Extract text from all pages
                extracted_text = []
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text().strip()
                    if page_text:
                        # Clean up the text - remove excessive whitespace and normalize spacing
                        cleaned_text = PDFProcessor.clean_pdf_text(page_text)
                        extracted_text.append(f"[Page {page_num + 1}]\n{cleaned_text}")
                
                full_text = "\n\n".join(extracted_text)
                page_count = len(pdf_reader.pages)
                
                return {
                    "text": full_text,
                    "page_count": page_count,
                    "extraction_method": "PyPDF2"
                }
                
            except ImportError:
                # Fallback approach
                return {
                    "text": "PDF content (PyPDF2 not available - install for better extraction)",
                    "page_count": 1,
                    "extraction_method": "basic"
                }
                
        except Exception as e:
            return {
                "text": f"Error extracting PDF content: {str(e)}",
                "page_count": 0,
                "extraction_method": "error",
                "error": str(e)
            }

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks."""
        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size

            # Try to break at sentence boundaries
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                sentence_endings = ['.', '!', '?', '\n\n']
                best_break = end

                for i in range(max(0, end - 100), end):
                    if text[i] in sentence_endings:
                        best_break = i + 1

                end = best_break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            # Calculate next start position with overlap
            start = max(start + 1, end - overlap)

            # Prevent infinite loop
            if start >= len(text):
                break

        return chunks


class DocumentService:
    """Main service for document processing operations."""

    def __init__(self):
        self.chroma_service = ChromaDBService()
        self.pdf_processor = PDFProcessor()
        try:
            self.s3_service = S3Service()
        except ValueError:
            # S3 not configured, fall back to no file storage
            self.s3_service = None

    def process_pdf_file(self, user_id: int, file_content: str, filename: str, 
                        content_type: str = "base64") -> Dict[str, Any]:
        """
        Process a PDF file: extract text, chunk it, and store in ChromaDB.
        
        Args:
            user_id: User identifier
            file_content: PDF content (base64 encoded or bytes)
            filename: Name of the PDF file
            content_type: Type of content ("base64" or "bytes")
            
        Returns:
            Processing result with statistics
        """
        # Extract text from PDF
        if content_type == "base64":
            extraction_result = self.pdf_processor.extract_text_from_pdf_base64(file_content)
        else:
            # Handle bytes content
            extraction_result = self.pdf_processor.extract_text_from_pdf_bytes(file_content)
        
        extracted_text = extraction_result["text"]
        page_count = extraction_result["page_count"]
        extraction_method = extraction_result["extraction_method"]

        # Chunk the text
        chunks = self.pdf_processor.chunk_text(extracted_text)

        # Store in ChromaDB
        result = self.chroma_service.add_document_chunks(user_id, filename, chunks)

        # Upload to S3 if configured
        s3_object_key = None
        if self.s3_service:
            try:
                s3_object_key = self.s3_service.upload_file(file_content, user_id, filename, content_type)
            except Exception as e:
                print(f"Warning: Failed to upload to S3: {str(e)}")

        return {
            "filename": filename,
            "extracted_text_length": len(extracted_text),
            "page_count": page_count,
            "chunks_created": len(chunks),
            "extraction_method": extraction_method,
            "storage_result": result,
            "s3_object_key": s3_object_key
        }

    def search_user_documents(self, user_id: int, query: str, n_results: int = 5) -> Dict[str, Any]:
        """Search through user's documents."""
        return self.chroma_service.search_documents(user_id, query, n_results)

    def delete_document(self, user_id: int, filename: str, s3_object_key: str = None) -> bool:
        """Delete a document and its chunks from ChromaDB and S3."""
        # Delete from ChromaDB
        chroma_deleted = self.chroma_service.delete_document_chunks(user_id, filename)
        
        # Delete from S3 if object key is provided
        s3_deleted = True
        if s3_object_key and self.s3_service:
            try:
                s3_deleted = self.s3_service.delete_file(s3_object_key)
            except Exception as e:
                print(f"Warning: Failed to delete from S3: {str(e)}")
                s3_deleted = False
        
        return chroma_deleted and s3_deleted
    
    def get_document_download_url(self, s3_object_key: str, expiration: int = 3600) -> str:
        """Get a presigned URL for downloading a document from S3."""
        if not self.s3_service:
            raise Exception("S3 service not configured")
        
        return self.s3_service.get_presigned_url(s3_object_key, expiration)
    
    def process_global_pdf_file(self, file_path: str, filename: str) -> Dict[str, Any]:
        """
        Process a global PDF file: extract text, chunk it, and store in global ChromaDB collection.
        
        Args:
            file_path: Path to the PDF file on disk
            filename: Name of the PDF file
            
        Returns:
            Processing result with statistics
        """
        # Read the file as bytes
        with open(file_path, 'rb') as f:
            pdf_bytes = f.read()
        
        # Extract text from PDF
        extraction_result = self.pdf_processor.extract_text_from_pdf_bytes(pdf_bytes)
        
        extracted_text = extraction_result["text"]
        page_count = extraction_result["page_count"]
        extraction_method = extraction_result["extraction_method"]

        # Chunk the text
        chunks = self.pdf_processor.chunk_text(extracted_text)

        # Store in global ChromaDB collection
        result = self.chroma_service.add_global_document_chunks(filename, chunks)

        return {
            "filename": filename,
            "extracted_text_length": len(extracted_text),
            "page_count": page_count,
            "chunks_created": len(chunks),
            "extraction_method": extraction_method,
            "storage_result": result
        }
    
    def search_global_documents(self, query: str, n_results: int = 5) -> Dict[str, Any]:
        """Search through global documents."""
        return self.chroma_service.search_global_documents(query, n_results)
    
    def delete_global_document(self, filename: str) -> bool:
        """Delete a global document and its chunks from ChromaDB."""
        return self.chroma_service.delete_global_document_chunks(filename)