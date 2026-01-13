import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import avatarImage from '@/assets/images/avatar.png';
import { documentsService, Document } from '@/api/documentsService';

export default function DocumentsWebScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentsService.getDocuments();
      setDocuments(data.results || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      Alert.alert('Error', 'Could not load your health records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      Alert.alert('Wrong File Type', 'Please choose a PDF file (like a scanned document or report)');
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Please choose a file smaller than 5MB. Large files may take too long to process.');
      return;
    }

    setUploading(true);

    try {
      // Documents service handles base64 conversion automatically
      await documentsService.uploadDocument(file);
      Alert.alert('Success', 'Your health record has been saved successfully!');
      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Could Not Save', 'Something went wrong while saving your document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFile) {
      handleFileUpload(pdfFile);
    } else {
      Alert.alert('Wrong File Type', 'Please drop a PDF file (like a scanned document or report)');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const downloadDocument = async (documentId: number) => {
    try {
      console.log('Starting download for document ID:', documentId);
      await documentsService.downloadDocument(documentId);
      console.log('Download completed successfully');
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Download Failed', 'Could not download your document. Please try again later.');
    }
  };

  const deleteDocument = async (documentId: number) => {
    if (confirm('Are you sure you want to remove this health record? Once removed, you cannot get it back.')) {
      try {
        await documentsService.deleteDocument(documentId);
        Alert.alert('Removed', 'Your health record has been removed');
        fetchDocuments(); // Refresh the list
      } catch (error) {
        console.error('Delete failed:', error);
        Alert.alert('Error', 'Failed to delete document');
      }
    }
  };

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Records</Text>
        
        <View style={styles.avaInfo}>
          <Image source={avatarImage} style={styles.avaAvatar} />
          <View style={styles.avaTextContainer}>
            <Text style={styles.avaTitle}>Keep your health records safe</Text>
            <Text style={styles.avaText}>Store your health documents securely - Ava learns from them to provide better personalized health guidance</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <div
          style={{
            ...styles.uploadSection,
            ...(dragActive && styles.uploadSectionActive),
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <MaterialCommunityIcons 
            name="cloud-upload" 
            size={64} 
            color={dragActive ? COLORS.primary : COLORS.textSecondary} 
            style={styles.uploadIcon}
          />
          <Text style={styles.uploadTitle}>
            {dragActive ? 'Drop file here' : 'Add Document'}
          </Text>
          
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleFileSelect}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons 
                  name="file-plus" 
                  size={24} 
                  color={COLORS.textOnPrimary} 
                />
                <Text style={styles.uploadButtonText}>Choose Document</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.helpSection}>
            <MaterialCommunityIcons name="information" size={18} color={COLORS.textSecondary} />
            <Text style={styles.helpText}>PDF files under 5MB work best</Text>
          </View>
        </div>
      </View>

      <View style={styles.documentsSection}>
        <Text style={styles.documentsTitle}>Your Documents ({documents.length})</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your health records...</Text>
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="file-document-outline" 
              size={80} 
              color={COLORS.textSecondary} 
            />
            <Text style={styles.emptyStateText}>No documents yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first health document</Text>
          </View>
        ) : (
          <View style={styles.documentsGrid}>
            {documents.map((doc) => (
              <View key={doc.id} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <MaterialCommunityIcons 
                    name="file-pdf-box" 
                    size={32} 
                    color={COLORS.primary} 
                  />
                  <View style={styles.documentActions}>
                    <TouchableOpacity
                      onPress={() => downloadDocument(doc.id)}
                      style={styles.actionButton}
                    >
                      <MaterialCommunityIcons 
                        name="download" 
                        size={24} 
                        color={COLORS.primary} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteDocument(doc.id)}
                      style={styles.actionButton}
                    >
                      <MaterialCommunityIcons 
                        name="delete" 
                        size={24} 
                        color={COLORS.error} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.documentName}>{doc.filename}</Text>
                
                <View style={styles.documentStats}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="file-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.statText}>{doc.page_count} pages</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="resize-bottom-right" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.statText}>{formatFileSize(doc.file_size)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.statText}>{formatDate(doc.uploaded_at)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 32,
    paddingTop: 80,
    paddingBottom: 40,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textSecondary,
    lineHeight: 26,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadSection: {
    alignItems: 'center',
    padding: 40,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  uploadSectionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  uploadIcon: {
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    cursor: 'pointer',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  uploadButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.medium,
    marginLeft: 8,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
  },
  helpText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  documentsSection: {
    flex: 1,
  },
  documentsTitle: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
    marginTop: 20,
    marginBottom: 12,
  },
  emptyStateSubtext: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 22,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  documentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    flex: 1,
    maxWidth: 350,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  documentName: {
    fontSize: FONT_SIZES.subheading,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    marginBottom: 16,
    lineHeight: 22,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    cursor: 'pointer',
  },
  documentDetails: {
    gap: 8,
  },
  documentStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  avaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: COLORS.primaryLight + '25',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  avaAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 20,
  },
  avaTextContainer: {
    flex: 1,
  },
  avaTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  avaText: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
});