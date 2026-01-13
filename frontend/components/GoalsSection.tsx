import { Modal } from "@/components/Modal";
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "@/constants/theme";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useModal } from "@/hooks/useModal";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
    deleteGoal,
    markGoalCompleted,
    unmarkGoalCompleted,
} from "../api/dashboardService";
import { Goal } from "../types";

interface GoalsSectionProps {
  goals: Goal[];
  onGoalUpdate?: () => void;
  onAddGoal?: () => void;
}

const GoalsSection: React.FC<GoalsSectionProps> = ({
  goals,
  onGoalUpdate,
  onAddGoal,
}) => {
  const { modalConfig, hideModal, showConfirm } = useModal();
  const { isMobile } = useMediaQuery();

  const handleGoalToggle = async (goal: Goal) => {
    console.log(
      "🔄 Button clicked! Goal:",
      goal.title,
      "Completed:",
      goal.completed
    );
    try {
      console.log("DEBUG FRONTEND: goal object:", goal);
      console.log("DEBUG FRONTEND: goalId:", goal.id);
      console.log("DEBUG FRONTEND: completed:", goal.completed);

      if (!goal.id) {
        console.error("Missing goal ID");
        return;
      }

      if (goal.completed) {
        console.log("🔄 Goal is completed, showing confirmation dialog...");
        showConfirm(
          "Mark as Not Done?",
          `Are you sure you want to mark "${goal.title}" as not completed?`,
          async () => {
            try {
              await unmarkGoalCompleted(goal.id);
              if (onGoalUpdate) {
                onGoalUpdate();
              }
            } catch (error) {
              console.error("Failed to unmark goal:", error);
            }
          },
          undefined,
          {
            confirmText: "Yes, Mark Not Done",
            cancelText: "Cancel",
            confirmStyle: "danger",
          }
        );
      } else {
        // No confirmation needed for marking as completed
        console.log("🔄 Goal is not completed, marking as completed...");
        await markGoalCompleted(goal.id);
        if (onGoalUpdate) {
          onGoalUpdate();
        }
      }
    } catch (error) {
      console.error("Failed to update goal status:", error);
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    showConfirm(
      "Delete Goal?",
      `Are you sure you want to permanently delete the goal "${goal.title}"?`,
      async () => {
        try {
          await deleteGoal(goal.id);
          if (onGoalUpdate) {
            onGoalUpdate();
          }
        } catch (error) {
          console.error("Failed to delete goal:", error);
        }
      },
      undefined,
      {
        confirmText: "Yes, Delete",
        cancelText: "Cancel",
        confirmStyle: "danger",
      }
    );
  };

  const navigateToGoals = () => {
    if (onAddGoal) {
      onAddGoal();
    } else {
      router.push("/(tabs)/goals");
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalHeaderText}>Today's Goals</Text>
        <TouchableOpacity
          style={styles.addGoalButton}
          onPress={navigateToGoals}
        >
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color={COLORS.textOnPrimary}
          />
          <Text style={styles.addGoalText}>Add</Text>
        </TouchableOpacity>
      </View>
      {goals.map((goal, index) => (
        <View key={index} style={styles.goalItem}>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalDetails}>
              {goal.category} • {goal.frequency}
            </Text>
          </View>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                goal.completed ? styles.completed : styles.notCompleted,
              ]}
              onPress={() => handleGoalToggle(goal)}
            >
              <MaterialCommunityIcons
                name={goal.completed ? "check-all" : "check"}
                size={18}
                color={COLORS.textOnPrimary}
              />
              {!isMobile && (
                <Text style={styles.actionButtonText}>
                  {goal.completed ? "Done" : "Complete"}
                </Text>
              )}
            </TouchableOpacity>
            {!goal.completed && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteGoal(goal)}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color={COLORS.error}
                />
                {!isMobile && (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
      <Modal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        buttons={modalConfig.buttons}
        onClose={hideModal}
        closeOnBackdrop={modalConfig.closeOnBackdrop}
        showCloseButton={modalConfig.showCloseButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 22,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  goalHeaderText: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    fontFamily: "sans-serif",
  },
  addGoalButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 6,
  },
  addGoalText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: "sans-serif",
  },
  goalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  goalInfo: {
    flex: 1,
    marginRight: 12,
  },
  goalTitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    fontFamily: "sans-serif",
    fontWeight: FONT_WEIGHTS.medium,
  },
  goalDetails: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textSecondary,
    fontFamily: "sans-serif",
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    justifyContent: "center",
    gap: 6,
  },
  completed: {
    backgroundColor: COLORS.primary,
  },
  notCompleted: {
    backgroundColor: COLORS.success,
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.error,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

export default GoalsSection;
