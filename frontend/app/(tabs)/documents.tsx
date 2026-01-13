import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import avatarImage from '@/assets/images/avatar.png';
import { documentsService, Document } from '@/api/documentsService';

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const uploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Wrong File Type', 'Please choose a PDF file (like a scanned document or report)');
        return;
      }

      // Check file size (5MB limit)
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please choose a file smaller than 5MB. Large files may take too long to process.');
        return;
      }

      setUploading(true);

      // Upload using documents service (it handles base64 conversion)
      await documentsService.uploadDocument({
        uri: file.uri,
        type: 'application/pdf',
        name: file.name,
      });
      Alert.alert('Success', 'Your health record has been saved successfully!');
      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Could Not Save', 'Something went wrong while saving your document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (documentId: number) => {
    try {
      console.log('Starting download for document ID:', documentId);
      await documentsService.downloadDocument(documentId);
      Alert.alert('Download Started', 'Your document download has been initiated.');
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Download Failed', 'Could not download your document. Please try again later.');
    }
  };

  const deleteDocument = async (documentId: number) => {
    Alert.alert(
      'Remove Health Record',
      'Are you sure you want to remove this health record? Once removed, you cannot get it back.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentsService.deleteDocument(documentId);
              Alert.alert('Removed', 'Your health record has been removed');
              fetchDocuments(); // Refresh the list
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
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
        <View style={styles.uploadSection}>
          <MaterialCommunityIcons 
            name="cloud-upload" 
            size={48} 
            color={COLORS.primary} 
            style={styles.uploadIcon}
          />
          <Text style={styles.uploadTitle}>Add Document</Text>
          
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={uploadDocument}
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
            <MaterialCommunityIcons name="information" size={16} color={COLORS.textSecondary} />
            <Text style={styles.helpText}>PDF files under 5MB work best</Text>
          </View>
        </View>
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
              size={64} 
              color={COLORS.textSecondary} 
            />
            <Text style={styles.emptyStateText}>No documents yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first health document</Text>
          </View>
        ) : (
          documents.map((doc) => (
            <View key={doc.id} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <MaterialCommunityIcons 
                  name="file-pdf-box" 
                  size={24} 
                  color={COLORS.primary} 
                />
                <Text style={styles.documentName}>{doc.filename}</Text>
                <View style={styles.documentActions}>
                  <TouchableOpacity
                    onPress={() => downloadDocument(doc.id)}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons 
                      name="download" 
                      size={20} 
                      color={COLORS.primary} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteDocument(doc.id)}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons 
                      name="delete" 
                      size={20} 
                      color={COLORS.error} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.documentDetails}>
                <View style={styles.documentStats}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="file-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.statText}>{doc.page_count}p</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="resize-bottom-right" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.statText}>{formatFileSize(doc.file_size)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.statText}>{formatDate(doc.uploaded_at)}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))
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
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadSection: {
    alignItems: 'center',
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: FONT_SIZES.subheading,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
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
    borderRadius: 6,
    padding: 10,
    marginTop: 16,
  },
  helpText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  documentsSection: {
    flex: 1,
  },
  documentsTitle: {
    fontSize: FONT_SIZES.subheading,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.subheading,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentName: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  documentDetails: {
    gap: 4,
  },
  documentStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  avaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  avaAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  avaTextContainer: {
    flex: 1,
  },
  avaTitle: {
    fontSize: FONT_SIZES.subheading,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  avaText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});