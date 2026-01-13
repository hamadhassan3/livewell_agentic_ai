// services/tokenStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = '@access_token';
const REFRESH_TOKEN_KEY = '@refresh_token';
const USER_KEY = '@user_data';

class TokenStorageService {
	/**
	 * Store access token securely based on platform
	 */
	async setAccessToken(token: string): Promise<void> {
		try {
			if (Platform.OS === 'web') {
				// For web, use localStorage
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
				}
			} else {
				// For native, use AsyncStorage
				await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
			}
		} catch (error) {
			console.error('Error storing access token:', error);
			throw error;
		}
	}

	/**
	 * Store refresh token securely based on platform
	 */
	async setRefreshToken(token: string): Promise<void> {
		try {
			if (Platform.OS === 'web') {
				// For web, use localStorage
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
				}
			} else {
				// For native, use AsyncStorage
				await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
			}
		} catch (error) {
			console.error('Error storing refresh token:', error);
			throw error;
		}
	}

	/**
	 * Store both access and refresh tokens
	 */
	async setTokens(accessToken: string, refreshToken: string): Promise<void> {
		await Promise.all([
			this.setAccessToken(accessToken),
			this.setRefreshToken(refreshToken)
		]);
	}

	/**
	 * Retrieve access token from storage
	 */
	async getAccessToken(): Promise<string | null> {
		try {
			if (Platform.OS === 'web') {
				if (typeof window !== 'undefined' && window.localStorage) {
					return window.localStorage.getItem(ACCESS_TOKEN_KEY);
				}
				return null;
			} else {
				return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
			}
		} catch (error) {
			console.error('Error retrieving access token:', error);
			return null;
		}
	}

	/**
	 * Retrieve refresh token from storage
	 */
	async getRefreshToken(): Promise<string | null> {
		try {
			if (Platform.OS === 'web') {
				if (typeof window !== 'undefined' && window.localStorage) {
					return window.localStorage.getItem(REFRESH_TOKEN_KEY);
				}
				return null;
			} else {
				return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
			}
		} catch (error) {
			console.error('Error retrieving refresh token:', error);
			return null;
		}
	}

	/**
	 * Retrieve both tokens from storage
	 */
	async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
		const [accessToken, refreshToken] = await Promise.all([
			this.getAccessToken(),
			this.getRefreshToken()
		]);
		return { accessToken, refreshToken };
	}

	/**
	 * Remove access token from storage
	 */
	async removeAccessToken(): Promise<void> {
		try {
			if (Platform.OS === 'web') {
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.removeItem(ACCESS_TOKEN_KEY);
				}
			} else {
				await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
			}
		} catch (error) {
			console.error('Error removing access token:', error);
			throw error;
		}
	}

	/**
	 * Remove refresh token from storage
	 */
	async removeRefreshToken(): Promise<void> {
		try {
			if (Platform.OS === 'web') {
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.removeItem(REFRESH_TOKEN_KEY);
				}
			} else {
				await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
			}
		} catch (error) {
			console.error('Error removing refresh token:', error);
			throw error;
		}
	}

	/**
	 * Remove both tokens from storage
	 */
	async removeTokens(): Promise<void> {
		await Promise.all([
			this.removeAccessToken(),
			this.removeRefreshToken()
		]);
	}

	/**
	 * Store user data
	 */
	async setUserData(userData: any): Promise<void> {
		try {
			const userString = JSON.stringify(userData);
			if (Platform.OS === 'web') {
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.setItem(USER_KEY, userString);
				}
			} else {
				await AsyncStorage.setItem(USER_KEY, userString);
			}
		} catch (error) {
			console.error('Error storing user data:', error);
			throw error;
		}
	}

	/**
	 * Retrieve user data
	 */
	async getUserData(): Promise<any | null> {
		try {
			let userString: string | null = null;

			if (Platform.OS === 'web') {
				if (typeof window !== 'undefined' && window.localStorage) {
					userString = window.localStorage.getItem(USER_KEY);
				}
			} else {
				userString = await AsyncStorage.getItem(USER_KEY);
			}

			return userString ? JSON.parse(userString) : null;
		} catch (error) {
			console.error('Error retrieving user data:', error);
			return null;
		}
	}

	/**
	 * Remove user data
	 */
	async removeUserData(): Promise<void> {
		try {
			if (Platform.OS === 'web') {
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.removeItem(USER_KEY);
				}
			} else {
				await AsyncStorage.removeItem(USER_KEY);
			}
		} catch (error) {
			console.error('Error removing user data:', error);
			throw error;
		}
	}

	/**
	 * Clear all auth data
	 */
	async clearAll(): Promise<void> {
		await Promise.all([this.removeTokens(), this.removeUserData()]);
	}
}

export const tokenStorage = new TokenStorageService();
