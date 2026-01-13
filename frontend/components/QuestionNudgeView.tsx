import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "@/constants/theme";
import { QuestionNudgeData, QuestionNudgeResponse } from "@/types";
import React, { useState } from "react";
import avatarImage from '@/assets/images/avatar.png';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
    TextInput,
    Alert,
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";

interface QuestionNudgeProps {
  data: QuestionNudgeData | null;
  onResponse: (response: string, sessionId: string) => void;
  isLoading?: boolean;
  response?: QuestionNudgeResponse | null;
}

const QuestionNudgeView: React.FC<QuestionNudgeProps> = ({
  data,
  onResponse,
  isLoading = false,
  response,
}) => {
  const [userResponse, setUserResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitResponse = async () => {
    if (!userResponse.trim()) {
      Alert.alert("Response Required", "Please enter a response before submitting.");
      return;
    }

    if (!data?.sessionId) {
      Alert.alert("Error", "Session not found. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onResponse(userResponse.trim(), data.sessionId);
      setUserResponse(""); // Clear input after successful submission
    } catch (error) {
      Alert.alert("Error", "Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (data && !data.question) {
    return <>
    </>
  }

  // Loading skeleton
  if (!data && isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>💬 Ava has a question for you</Text>
        </View>
        <View style={styles.promptSection}>
          <Image source={avatarImage} style={styles.avatar} />
          <View style={styles.skeletonTextContainer}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '80%' }]} />
          </View>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!data) return null;

  // Show response confirmation if we have a response
  if (response) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>✅ Thank you for your response!</Text>
        </View>
        <View style={styles.promptSection}>
          <Image source={avatarImage} style={styles.avatar} />
          <Text style={styles.responseText}>{response.response}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>💬 Ava has a question for you</Text>
      </View>
      
      <View style={styles.promptSection}>
        <Image source={avatarImage} style={styles.avatar} />
        <Text style={styles.questionText}>{data.question}</Text>
      </View>
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.responseSection}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your response here..."
            placeholderTextColor={COLORS.textSecondary}
            value={userResponse}
            onChangeText={setUserResponse}
            multiline
            numberOfLines={3}
            maxLength={500}
            editable={!isSubmitting}
          />
          
          <View style={styles.actionContainer}>
            <Text style={styles.characterCount}>
              {userResponse.length}/500
            </Text>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!userResponse.trim() || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitResponse}
              disabled={!userResponse.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: wp('5%'),
    marginBottom: hp('2.5%'),
    borderWidth: 1,
    borderColor: COLORS.primary,
    minHeight: hp("15%"),
  },
  headerContainer: {
    marginBottom: hp('2%'),
    alignItems: 'center',
  },
  headerText: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.primary,
    textAlign: 'center',
  },
  promptSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: hp('2%'),
  },
  questionText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    marginLeft: wp('4%'),
    flex: 1,
    lineHeight: hp("3%"),
    fontWeight: FONT_WEIGHTS.medium,
  },
  responseText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    marginLeft: wp('4%'),
    flex: 1,
    lineHeight: hp("3%"),
    fontStyle: 'italic',
  },
  responseSection: {
    marginTop: hp('1%'),
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: wp('4%'),
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    textAlignVertical: 'top',
    minHeight: hp('10%'),
    maxHeight: hp('15%'),
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp('1.5%'),
  },
  characterCount: {
    fontSize: FONT_SIZES.body * 0.8,
    color: COLORS.textSecondary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('1.2%'),
    borderRadius: 25,
    minWidth: wp('20%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.medium,
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: hp('2%'),
  },
  skeletonTextContainer: {
    flex: 1,
    marginLeft: wp('4%'),
  },
  skeletonLine: {
    height: hp("2%"),
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: hp('1%'),
    opacity: 0.6,
  },
  avatar: {
    width: hp("7%"),
    height: hp("7%"),
    borderRadius: hp("3.5%"),
  },
});

export default QuestionNudgeView;