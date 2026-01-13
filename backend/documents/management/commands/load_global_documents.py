"""
Management command to load global health documents from the docs folder.
"""
import os
import hashlib
from pathlib import Path
from django.core.management.base import BaseCommand
from django.utils import timezone
from documents.models import GlobalDocument
from documents.services import DocumentService


class Command(BaseCommand):
    help = 'Load global health documents from the docs folder into ChromaDB'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reload all documents even if they haven\'t changed',
        )

    def handle(self, *args, **options):
        # Define the docs folder path
        docs_folder = Path('documents/docs')
        
        if not docs_folder.exists():
            self.stdout.write(self.style.WARNING(f'Docs folder not found at {docs_folder}'))
            return
        
        self.stdout.write(f'Loading documents from: {docs_folder}')
        
        # Get all PDF files in the docs folder
        pdf_files = list(docs_folder.glob('*.pdf'))
        
        if not pdf_files:
            self.stdout.write(self.style.WARNING('No PDF files found in docs folder'))
            return
        
        document_service = DocumentService()
        processed = 0
        skipped = 0
        errors = 0
        
        for pdf_path in pdf_files:
            filename = pdf_path.name
            
            # Calculate file hash to detect changes
            with open(pdf_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
            
            file_size = pdf_path.stat().st_size
            
            try:
                # Check if document already exists
                existing_doc = GlobalDocument.objects.filter(filename=filename).first()
                
                # Skip if file hasn't changed and not forcing reload
                if existing_doc and existing_doc.file_hash == file_hash and not options['force']:
                    self.stdout.write(f'Skipping {filename} - no changes detected')
                    skipped += 1
                    continue
                
                # Process the PDF
                self.stdout.write(f'Processing {filename}...')
                result = document_service.process_global_pdf_file(
                    file_path=str(pdf_path),
                    filename=filename
                )
                
                # Save or update the database record
                if existing_doc:
                    existing_doc.file_hash = file_hash
                    existing_doc.file_size = file_size
                    existing_doc.processed_at = timezone.now()
                    existing_doc.chunks_count = result['chunks_created']
                    existing_doc.extracted_text_length = result['extracted_text_length']
                    existing_doc.page_count = result['page_count']
                    existing_doc.save()
                    self.stdout.write(self.style.SUCCESS(f'Updated {filename}'))
                else:
                    GlobalDocument.objects.create(
                        filename=filename,
                        file_path=str(pdf_path),
                        file_size=file_size,
                        file_hash=file_hash,
                        processed_at=timezone.now(),
                        chunks_count=result['chunks_created'],
                        extracted_text_length=result['extracted_text_length'],
                        page_count=result['page_count']
                    )
                    self.stdout.write(self.style.SUCCESS(f'Added {filename}'))
                
                processed += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing {filename}: {e}'))
                errors += 1
        
        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary: Processed {processed} documents, skipped {skipped}, errors {errors}'
            )
        )