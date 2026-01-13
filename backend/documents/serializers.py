from rest_framework import serializers
from .models import Document, DocumentSearchHistory


class DocumentUploadSerializer(serializers.Serializer):
    file_content = serializers.CharField()  # Base64 encoded PDF content
    filename = serializers.CharField(max_length=255)
    
    def validate_filename(self, value):
        if not value.lower().endswith('.pdf'):
            raise serializers.ValidationError("Only PDF files (.pdf) are supported.")
        return value
    
    def validate_file_content(self, value):
        """Validate that the file content is valid base64."""
        try:
            import base64
            base64.b64decode(value)
            return value
        except Exception:
            raise serializers.ValidationError("Invalid file content. Must be valid base64 encoded PDF.")


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            'id', 'filename', 'file_size', 'uploaded_at', 
            'processed_at', 'chunks_count', 'extracted_text_length', 'page_count', 's3_object_key'
        ]
        read_only_fields = fields


class DocumentSearchSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=1000)
    n_results = serializers.IntegerField(default=5, min_value=1, max_value=20)


class DocumentSearchResultSerializer(serializers.Serializer):
    query = serializers.CharField()
    results = serializers.JSONField()
    search_time = serializers.FloatField(required=False)


class DocumentSearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSearchHistory
        fields = ['id', 'query', 'results_count', 'searched_at']
        read_only_fields = fields