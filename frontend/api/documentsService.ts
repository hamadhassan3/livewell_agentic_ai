import apiClient from './apiClient';

export interface Document {
  id: number;
  filename: string;
  file_size: number;
  uploaded_at: string;
  processed_at: string;
  chunks_count: number;
  extracted_text_length: number;
  page_count: number;
  s3_object_key?: string;
}

export interface DocumentUploadResponse {
  message: string;
  document_id: number;
  processing_result: {
    filename: string;
    extracted_text_length: number;
    page_count: number;
    chunks_created: number;
    extraction_method: string;
    storage_result: {
      document_name: string;
      chunks_added: number;
      collection_name: string;
    };
  };
}

export interface DocumentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Document[];
}

/**
 * Convert file to base64 encoding
 */
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data URL prefix (data:application/pdf;base64,)
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Convert mobile file URI to base64 encoding
 */
const convertMobileFileToBase64 = async (fileUri: string): Promise<string> => {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to convert mobile file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const documentsService = {
  /**
   * Upload a document file using base64 encoding
   */
  async uploadDocument(file: File | { uri: string; type: string; name: string }): Promise<DocumentUploadResponse> {
    let base64Content: string;
    let filename: string;
    
    if ('uri' in file) {
      // Mobile file object
      base64Content = await convertMobileFileToBase64(file.uri);
      filename = file.name;
    } else {
      // Web File object
      base64Content = await convertToBase64(file);
      filename = file.name;
    }

    const response = await apiClient.post('/documents/upload/', {
      file_content: base64Content,
      filename: filename,
    });

    return response.data;
  },

  /**
   * Get list of user's documents
   */
  async getDocuments(page: number = 1, pageSize: number = 10): Promise<DocumentListResponse> {
    const response = await apiClient.get('/documents/list/', {
      params: {
        page,
        page_size: pageSize,
      },
    });

    return response.data;
  },

  /**
   * Delete a document
   */
  async deleteDocument(documentId: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/documents/${documentId}/delete/`);
    return response.data;
  },

  /**
   * Get download URL for a document
   */
  async getDownloadUrl(documentId: number): Promise<{ download_url: string; filename: string; expires_in: number }> {
    const response = await apiClient.get(`/documents/${documentId}/download/`);
    return response.data;
  },

  /**
   * Download a document (triggers browser download)
   */
  async downloadDocument(documentId: number): Promise<void> {
    try {
      console.log('Getting download URL for document:', documentId);
      const downloadData = await this.getDownloadUrl(documentId);
      console.log('Download URL received:', downloadData);
      
      // Check if we're in a web environment
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        console.log('Web environment detected, creating download link');
        // Web environment - use anchor element
        const link = document.createElement('a');
        link.href = downloadData.download_url;
        link.download = downloadData.filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Append to body temporarily for Firefox compatibility
        document.body.appendChild(link);
        console.log('Triggering download for:', downloadData.filename);
        link.click();
        document.body.removeChild(link);
      } else {
        console.log('React Native environment detected, using Linking');
        // React Native environment - use Linking
        const { Linking } = require('react-native');
        await Linking.openURL(downloadData.download_url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  },

  /**
   * Search documents
   */
  async searchDocuments(query: string, nResults: number = 5): Promise<any> {
    const response = await apiClient.post('/documents/search/', {
      query,
      n_results: nResults,
    });

    return response.data;
  },

  /**
   * Get search history
   */
  async getSearchHistory(page: number = 1, pageSize: number = 10): Promise<any> {
    const response = await apiClient.get('/documents/search-history/', {
      params: {
        page,
        page_size: pageSize,
      },
    });

    return response.data;
  },
};