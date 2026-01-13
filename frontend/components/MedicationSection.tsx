import { Modal } from "@/components/Modal";
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "@/constants/theme";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useModal } from "@/hooks/useModal";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
    deleteMedication,
    markMedicationTaken,
    unmarkMedicationTaken,
} from "../api/dashboardService";
import { Medication } from "../types";

interface MedicationSectionProps {
  medications: Medication[];
  onMedicationUpdate?: () => void;
  onAddMedication?: () => void;
}

const MedicationSection: React.FC<MedicationSectionProps> = ({
  medications,
  onMedicationUpdate,
  onAddMedication,
}) => {
  const { modalConfig, hideModal, showConfirm } = useModal();
  const { isMobile } = useMediaQuery();

  const handleMedicationToggle = async (medication: Medication) => {
    console.log(
      "💊 Button clicked! Medication:",
      medication.name,
      "Taken:",
      medication.taken
    );
    try {
      console.log("DEBUG FRONTEND: medication object:", medication);
      console.log("DEBUG FRONTEND: medicationId:", medication.medicationId);
      console.log("DEBUG FRONTEND: scheduledTime:", medication.scheduledTime);

      if (!medication.medicationId || !medication.scheduledTime) {
        console.error("Missing medication ID or scheduled time");
        return;
      }

      if (medication.taken) {
        console.log("💊 Medication is taken, showing confirmation dialog...");
        showConfirm(
          "Mark as Not Taken?",
          `Are you sure you want to mark "${medication.name}" as not taken?`,
          async () => {
            try {
              await unmarkMedicationTaken(
                medication.medicationId,
                medication.scheduledTime
              );
              if (onMedicationUpdate) {
                onMedicationUpdate();
              }
            } catch (error) {
              console.error("Failed to unmark medication:", error);
            }
          },
          undefined,
          {
            confirmText: "Yes, Mark Not Taken",
            cancelText: "Cancel",
            confirmStyle: "danger",
          }
        );
      } else {
        // No confirmation needed for marking as taken
        console.log("💊 Medication is not taken, marking as taken...");
        await markMedicationTaken(
          medication.medicationId,
          medication.scheduledTime
        );
        if (onMedicationUpdate) {
          onMedicationUpdate();
        }
      }
    } catch (error) {
      console.error("Failed to update medication status:", error);
    }
  };

  const handleDeleteMedication = async (medication: Medication) => {
    showConfirm(
      "Delete Medication?",
      `Are you sure you want to permanently delete the medication "${medication.name}" for this time slot?`,
      async () => {
        try {
          await deleteMedication(medication.medicationId);
          if (onMedicationUpdate) {
            onMedicationUpdate();
          }
        } catch (error) {
          console.error("Failed to delete medication:", error);
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

  const navigateToMedications = () => {
    if (onAddMedication) {
      onAddMedication();
    } else {
      router.push("/(tabs)/medication");
    }
  };

  return (
    <View style={[styles.card, isMobile && styles.cardMobile]}>
      <View
        style={[
          styles.medicationHeader,
          isMobile && styles.medicationHeaderMobile,
        ]}
      >
        <Text
          style={[
            styles.medicationHeaderText,
            isMobile && styles.medicationHeaderTextMobile,
          ]}
        >
          Today's Medications
        </Text>
        <TouchableOpacity
          style={[
            styles.addMedicationButton,
            isMobile && styles.addMedicationButtonMobile,
          ]}
          onPress={navigateToMedications}
        >
          <MaterialCommunityIcons
            name="plus"
            size={isMobile ? 18 : 20}
            color={COLORS.textOnPrimary}
          />
          <Text
            style={[
              styles.addMedicationText,
              isMobile && styles.addMedicationTextMobile,
            ]}
          >
            Add
          </Text>
        </TouchableOpacity>
      </View>
      {medications.map((med, index) => (
        <View
          key={index}
          style={[
            styles.medicationItem,
            isMobile && styles.medicationItemMobile,
          ]}
        >
          <View style={styles.medicationInfo}>
            <Text
              style={[
                styles.medicationName,
                isMobile && styles.medicationNameMobile,
              ]}
            >
              {med.name}
            </Text>
            <Text
              style={[
                styles.medicationTime,
                isMobile && styles.medicationTimeMobile,
              ]}
            >
              {med.time}
            </Text>
          </View>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                med.taken ? styles.completed : styles.notCompleted,
                isMobile && styles.actionButtonMobile,
              ]}
              onPress={() => handleMedicationToggle(med)}
            >
              <MaterialCommunityIcons
                name={med.taken ? "check-all" : "pill"}
                size={isMobile ? 16 : 18}
                color={COLORS.textOnPrimary}
              />
              {!isMobile && (
                <Text
                  style={[
                    styles.actionButtonText,
                    isMobile && styles.actionButtonTextMobile,
                  ]}
                >
                  {med.taken ? "Taken" : "Take"}
                </Text>
              )}
            </TouchableOpacity>
            {!med.taken && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.deleteButton,
                  isMobile && styles.deleteButtonMobile,
                ]}
                onPress={() => handleDeleteMedication(med)}
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
  cardMobile: {
    padding: 16,
    borderRadius: 12,
  },
  medicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  medicationHeaderMobile: {
    marginBottom: 12,
    gap: 8,
  },
  medicationHeaderText: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    fontFamily: "sans-serif",
  },
  medicationHeaderTextMobile: {
    fontSize: FONT_SIZES.body,
    flex: 1,
  },
  addMedicationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 6,
  },
  addMedicationButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  addMedicationText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: "sans-serif",
  },
  addMedicationTextMobile: {
    fontSize: FONT_SIZES.subheading,
  },
  medicationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  medicationItemMobile: {
    paddingVertical: 12,
    gap: 8,
  },
  medicationInfo: {
    flex: 1,
    marginRight: 8,
  },
  medicationName: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    fontFamily: "sans-serif",
  },
  medicationNameMobile: {
    fontSize: FONT_SIZES.subheading,
  },
  medicationTime: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textSecondary,
    fontFamily: "sans-serif",
    marginTop: 2,
  },
  medicationTimeMobile: {
    fontSize: 12,
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
  actionButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
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
  deleteButtonMobile: {
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
  actionButtonTextMobile: {
    fontSize: FONT_SIZES.subheading,
  },
});

export default MedicationSection;
