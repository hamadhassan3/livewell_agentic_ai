import apiClient from './apiClient';

export interface UserPreferences {
	// Health conditions
	is_diabetic?: boolean;
	is_hypertensive?: boolean;
	has_heart_disease?: boolean;
	has_arthritis?: boolean;
	has_osteoporosis?: boolean;
	has_vision_impairment?: boolean;
	has_hearing_impairment?: boolean;
	has_memory_concerns?: boolean;
	other_health_conditions?: string;

	// Medication tracking
	takes_medications?: boolean;
	medication_reminder_enabled?: boolean;
	medication_reminder_times?: string[];

	// Physical activity preferences
	activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
	preferred_exercise_types?: string[];
	exercise_goal_minutes_per_week?: number;

	// Social engagement
	social_preference?: 'very_social' | 'moderately_social' | 'occasionally_social' | 'prefer_solitude';
	interested_in_group_activities?: boolean;

	// Mental wellness
	stress_level?: 'low' | 'moderate' | 'high';
	interested_in_mindfulness?: boolean;
	interested_in_meditation?: boolean;

	// Sleep patterns
	typical_bedtime?: string;
	typical_wake_time?: string;
	sleep_quality_rating?: number;

	// Nutrition preferences
	diet_type?: 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'mediterranean' | 'low_sodium' | 'diabetic_friendly' | 'other';
	food_allergies?: string;
	water_intake_goal_liters?: number;

	// Independence and mobility
	mobility_level?: 'fully_mobile' | 'uses_walking_aid' | 'wheelchair_user' | 'limited_mobility';
	needs_transportation_assistance?: boolean;

	// Technology comfort
	tech_comfort_level?: 'very_comfortable' | 'comfortable' | 'somewhat_comfortable' | 'needs_assistance';

	// Notification preferences
	notification_frequency?: 'none' | 'daily' | 'twice_daily' | 'three_times_daily' | 'hourly';
	notification_time_preference?: 'morning' | 'afternoon' | 'evening' | 'flexible';

	// Personality and motivation
	personality_type?: 'achiever' | 'explorer' | 'socializer' | 'competitor';
	motivation_type?: 'intrinsic' | 'extrinsic' | 'social' | 'competitive';

	// Goal preferences
	prefers_short_term_goals?: boolean;
	prefers_long_term_goals?: boolean;
	goal_reminder_enabled?: boolean;

	// Emergency and safety
	emergency_contact_name?: string;
	emergency_contact_phone?: string;
	emergency_contact_relationship?: string;

	// Individual date tracking for each preference field
	is_diabetic_updated_at?: string;
	is_hypertensive_updated_at?: string;
	has_heart_disease_updated_at?: string;
	has_arthritis_updated_at?: string;
	has_osteoporosis_updated_at?: string;
	has_vision_impairment_updated_at?: string;
	has_hearing_impairment_updated_at?: string;
	has_memory_concerns_updated_at?: string;
	other_health_conditions_updated_at?: string;
	takes_medications_updated_at?: string;
	medication_reminder_enabled_updated_at?: string;
	medication_reminder_times_updated_at?: string;
	activity_level_updated_at?: string;
	preferred_exercise_types_updated_at?: string;
	exercise_goal_minutes_per_week_updated_at?: string;
	social_preference_updated_at?: string;
	interested_in_group_activities_updated_at?: string;
	stress_level_updated_at?: string;
	interested_in_mindfulness_updated_at?: string;
	interested_in_meditation_updated_at?: string;
	typical_bedtime_updated_at?: string;
	typical_wake_time_updated_at?: string;
	sleep_quality_rating_updated_at?: string;
	diet_type_updated_at?: string;
	food_allergies_updated_at?: string;
	water_intake_goal_liters_updated_at?: string;
	mobility_level_updated_at?: string;
	needs_transportation_assistance_updated_at?: string;
	tech_comfort_level_updated_at?: string;
	notification_frequency_updated_at?: string;
	notification_time_preference_updated_at?: string;
	personality_type_updated_at?: string;
	motivation_type_updated_at?: string;
	prefers_short_term_goals_updated_at?: string;
	prefers_long_term_goals_updated_at?: string;
	goal_reminder_enabled_updated_at?: string;
	emergency_contact_name_updated_at?: string;
	emergency_contact_phone_updated_at?: string;
	emergency_contact_relationship_updated_at?: string;

	// General timestamps
	created_at?: string;
	updated_at?: string;

	// Computed fields from backend
	health_risk_factors?: string[];
	recommended_exercise_duration?: number;
	is_high_risk_user?: boolean;
}

export interface ApiError {
	message: string;
	code?: string;
	status?: number;
}

class PreferencesService {
	/**
	 * Get current user's preferences
	 */
	async getPreferences(): Promise<UserPreferences> {
		try {
			const response = await apiClient.get<UserPreferences>('/profiles/preferences/');
			return response.data;
		} catch (error: any) {
			if (error.response && error.response.status === 404) {
				// No preferences found, return empty object
				throw this.handleApiError(error);
			}
			throw this.handleApiError(error);
		}
	}

	/**
	 * Create or update user preferences
	 */
	async updatePreferences(preferencesData: Partial<UserPreferences>): Promise<UserPreferences> {
		try {
			const response = await apiClient.put<{
				message: string;
				data: UserPreferences;
			}>('/profiles/preferences/', preferencesData);
			return response.data.data;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Partially update user preferences
	 */
	async patchPreferences(preferencesData: Partial<UserPreferences>): Promise<UserPreferences> {
		try {
			const response = await apiClient.patch<{
				message: string;
				data: UserPreferences;
			}>('/profiles/preferences/', preferencesData);
			return response.data.data;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Reset user preferences to default values
	 */
	async resetPreferences(): Promise<{ message: string }> {
		try {
			const response = await apiClient.delete<{ message: string }>('/profiles/preferences/');
			return response.data;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Centralized error handling for API calls
	 */
	private handleApiError(error: any): ApiError {
		if (error.response) {
			// Server responded with error status
			return {
				message: error.response.data?.detail || error.response.data?.message || 'An error occurred',
				code: error.response.data?.code,
				status: error.response.status,
			};
		} else if (error.request) {
			// Network error
			return {
				message: 'Network error. Please check your connection.',
				code: 'NETWORK_ERROR',
			};
		} else {
			// Other error
			return {
				message: error.message || 'An unexpected error occurred',
				code: 'UNKNOWN_ERROR',
			};
		}
	}
}

// Export singleton instance
export const preferencesService = new PreferencesService();