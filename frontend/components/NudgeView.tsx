import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "@/constants/theme";
import { NudgeData, NudgeFeedback } from "@/types";
import React from "react";
import avatarImage from '@/assets/images/avatar.png';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
} from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

interface NudgeProps {
  data: NudgeData | null;
  onFeedback: (feedback: NudgeFeedback) => void;
  isLoading?: boolean;
}

const NudgeView: React.FC<NudgeProps> = ({
  data,
  onFeedback,
  isLoading = false,
}) => {
  if (!data && isLoading) {
    return (
      <View style={styles.container}>
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

  return (
    <View style={styles.container}>
      <View style={styles.promptSection}>
        <Image source={require('@/assets/images/avatar.png')} style={styles.avatar} />
        <Text style={styles.text}>{data.text}</Text>
      </View>
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.feedbackContainer}>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => onFeedback("like")}
            disabled={isLoading}
          >
            <Text style={styles.emojiButton}>👍</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => onFeedback("dislike")}
            disabled={isLoading}
          >
            <Text style={styles.emojiButton}>👎</Text>
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
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: hp("12%"),
  },
  promptSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  text: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    marginLeft: 15,
    flex: 1,
    lineHeight: hp("3%"),
  },
  feedbackContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 15,
    marginTop: 10,
  },
  feedbackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiButton: {
    fontSize: hp("3%"),
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  skeletonTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  skeletonLine: {
    height: hp("2%"),
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 8,
    opacity: 0.6,
  },
  avatar: {
    width: hp("7%"),
    height: hp("7%"),
    borderRadius: hp("3.5%"),
  },
});

export default NudgeView;