// services/preferenceStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TTS_ENABLED_KEY = "@chat_tts_enabled";
const STEP_COUNT_LAST_FETCHED_KEY = "STEP_COUNT_LAST_FETCHED_TIMESTAMP";

class PreferenceStorageService {
  private async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        window.localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error storing preference with key ${key}:`, error);
    }
  }

  private async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return window.localStorage.getItem(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error(`Error retrieving preference with key ${key}:`, error);
      return null;
    }
  }

  async setTtsEnabled(isEnabled: boolean): Promise<void> {
    await this.setItem(TTS_ENABLED_KEY, JSON.stringify(isEnabled));
  }

  async getTtsEnabled(): Promise<boolean> {
    try {
      const storedValue = await this.getItem(TTS_ENABLED_KEY);
      // Default to false if not set
      return storedValue !== null ? JSON.parse(storedValue) : false;
    } catch (e) {
      console.error("Failed to parse TTS preference.", e);
      // Default to false in case of parsing error
      return false;
    }
  }

  async saveStepCountLastFetchedTime(date: Date): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STEP_COUNT_LAST_FETCHED_KEY,
        date.toISOString()
      );
    } catch (error) {
      console.error("Error saving last fetched time:", error);
    }
  }

  async getStepCountLastFetchedTime(): Promise<Date | null> {
    try {
      const stored = await AsyncStorage.getItem(STEP_COUNT_LAST_FETCHED_KEY);
      return stored ? new Date(stored) : null;
    } catch (error) {
      console.error("Error reading last fetched time:", error);
      return null;
    }
  }
}

export const preferenceStorage = new PreferenceStorageService();
