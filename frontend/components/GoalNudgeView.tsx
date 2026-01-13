import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "@/constants/theme";
import { GoalNudgeData, GoalNudgeResponse } from "@/types";
import React, { useState } from "react";
import avatarImage from '@/assets/images/avatar.png';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
    Alert,
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";

interface GoalNudgeProps {
  data: GoalNudgeData | null;
  onResponse: (response: string, sessionId: string) => void;
  isLoading?: boolean;
  response?: GoalNudgeResponse | null;
}

const GoalNudgeView: React.FC<GoalNudgeProps> = ({
  data,
  onResponse,
  isLoading = false,
  response,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResponse = async (userResponse: "yes" | "no") => {
    if (!data?.sessionId) {
      Alert.alert("Error", "Session not found. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onResponse(userResponse, data.sessionId);
    } catch (error) {
      Alert.alert("Error", "Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (data && !data.goal) {
    return <></>
  }

  // Loading skeleton
  if (!data && isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>🎯 Ava has a goal suggestion for you</Text>
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
          <Text style={styles.headerText}>
            {response.accepted ? "🎉 Great! Let's reach higher!" : "✨ That's okay, we'll try again later!"}
          </Text>
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
        <Text style={styles.headerText}>🎯 Ava has a goal suggestion for you</Text>
      </View>
      
      <View style={styles.promptSection}>
        <Image source={avatarImage} style={styles.avatar} />
        <Text style={styles.goalText}>{data.goal}</Text>
      </View>
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.responseButton, styles.noButton]}
            onPress={() => handleResponse("no")}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={[styles.buttonText, styles.noButtonText]}>No, thanks</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.responseButton, styles.yesButton]}
            onPress={() => handleResponse("yes")}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={[styles.buttonText, styles.yesButtonText]}>Yes, let's do it!</Text>
            )}
          </TouchableOpacity>
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
  goalText: {
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
  buttonSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('1%'),
    gap: wp('3%'),
  },
  responseButton: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp('5%'),
  },
  yesButton: {
    backgroundColor: COLORS.primary,
  },
  noButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.medium,
  },
  yesButtonText: {
    color: COLORS.surface,
  },
  noButtonText: {
    color: COLORS.textSecondary,
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

export default GoalNudgeView;