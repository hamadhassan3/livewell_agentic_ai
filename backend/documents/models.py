from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Document(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField()  # Size in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    chunks_count = models.IntegerField(default=0)
    extracted_text_length = models.IntegerField(default=0)
    page_count = models.IntegerField(default=0)  # Number of pages in PDF
    chroma_collection_name = models.CharField(max_length=255)
    s3_object_key = models.CharField(max_length=500, null=True, blank=True)  # S3 object key for file
    
    class Meta:
        ordering = ['-uploaded_at']
        unique_together = ['user', 'filename']
    
    def __str__(self):
        return f"{self.user.email} - {self.filename}"


class GlobalDocument(models.Model):
    """Documents that are available to all users (health information, guides, etc.)"""
    filename = models.CharField(max_length=255, unique=True)
    file_path = models.CharField(max_length=500)
    file_size = models.IntegerField()
    file_hash = models.CharField(max_length=64)  # SHA256 hash to detect file changes
    processed_at = models.DateTimeField(auto_now_add=True)
    chunks_count = models.IntegerField(default=0)
    extracted_text_length = models.IntegerField(default=0)
    page_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-processed_at']
    
    def __str__(self):
        return f"Global: {self.filename}"


class DocumentSearchHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='search_history')
    query = models.TextField()
    results_count = models.IntegerField()
    searched_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-searched_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.query[:50]}..."
