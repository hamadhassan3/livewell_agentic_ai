// App Index - Entry point for authentication and questionnaire
import { AuthNavigator } from "@/components/AuthNavigator";
import { NotificationDisplay } from "@/components/NotificationDisplay";
import { useAuthStore } from "@/hooks/useAuthStore";
import { usePedometer } from "@/hooks/usePedometer";
import QuestionnaireScreen from "@/screens/QuestionnaireScreen";
import React from "react";
import { StyleSheet, View } from "react-native";

/**
 * Index Screen - Shows login or questionnaire based on auth state
 *
 * Note: Auth initialization and route protection is handled by AuthProvider in _layout.tsx
 * This component only renders the appropriate UI for the current state.
 */
export default function IndexScreen() {
  const { isAuthenticated } = useAuthStore();

  // Call the pedometer hook at the top level.
  // Its internal logic will handle starting/stopping based on auth state.
  usePedometer();

  // Show login for unauthenticated users
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <AuthNavigator
          onAuthSuccess={() => {
            // AuthProvider will handle redirect to questionnaire or tabs
            console.log("[Index] Authentication successful");
          }}
        />
      </View>
    );
  }

  // Show questionnaire for authenticated users (if not completed, they'll be here)
  // AuthProvider ensures authenticated users with completed questionnaire are redirected to tabs
  return (
    <View style={styles.container}>
      <QuestionnaireScreen />
      <NotificationDisplay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
