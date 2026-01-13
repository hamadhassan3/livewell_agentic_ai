import apiClient from './apiClient';

export interface UserProfile {
	id: string;
	email: string;
	name: string;
	gender?: string;
	date_of_birth?: string;
	height?: number;
	weight?: number;
	age?: number;
	bmi?: number;
}

export interface UpdateProfileRequest {
	name?: string;
	gender?: string;
	date_of_birth?: string;
	height?: number;
	weight?: number;
}

export interface ApiError {
	message: string;
	code?: string;
	status?: number;
}

class ProfileService {
	/**
	 * Get current user's profile
	 */
	async getProfile(): Promise<UserProfile> {
		try {
			const response = await apiClient.get<UserProfile>('/profiles/profile/');
			return response.data;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Update current user's profile
	 */
	async updateProfile(profileData: UpdateProfileRequest): Promise<UserProfile> {
		try {
			const response = await apiClient.patch<UserProfile>(
				'/profiles/profile/',
				profileData
			);
			return response.data;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Delete current user's account
	 */
	async deleteAccount(): Promise<{ message: string }> {
		try {
			const response = await apiClient.delete<{ message: string }>(
				'/profiles/profile/'
			);
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
export const profileService = new ProfileService();