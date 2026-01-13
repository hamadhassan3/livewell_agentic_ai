// services/authService.ts
import apiClient from '../api/apiClient';

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	name: string;
}

export interface JWTResponse {
	access: string;
	refresh: string;
}

export interface User {
	id: string;
	email: string;
	name: string;
	photo?: string;
	gender?: string;
	date_of_birth?: string;
	height?: number;
	weight?: number;
	age?: number;
	bmi?: number;
}

export interface AuthResponse {
	access: string;
	refresh: string;
	user?: User;
}

export interface ApiError {
	message: string;
	code?: string;
	status?: number;
}

class AuthService {
	/**
	 * Login with email and password
	 */
	async login(credentials: LoginRequest): Promise<AuthResponse> {
		try {
			// Get JWT tokens from Django Simple JWT
			const jwtResponse = await apiClient.post<JWTResponse>(
				'/profiles/login/',
				credentials
			);

			// Decode JWT to extract user information
			const user = this.decodeTokenPayload(jwtResponse.data.access);

			return {
				access: jwtResponse.data.access,
				refresh: jwtResponse.data.refresh,
				user: user
			};
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Register a new user
	 */
	async register(userData: RegisterRequest): Promise<{ message: string }> {
		try {
			const response = await apiClient.post<{ message: string }>(
				'/profiles/register/',
				userData
			);
			return response.data;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refreshToken(refreshToken: string): Promise<{ access: string }> {
		try {
			const response = await apiClient.post<{ access: string }>(
				'/profiles/refresh/',
				{ refresh: refreshToken }
			);
			return response.data;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Authenticate with Google OAuth
	 */
	async googleAuth(accessToken: string): Promise<AuthResponse> {
		try {
			const response = await apiClient.post<AuthResponse>(
				'/profiles/auth/google/',
				{ access_token: accessToken }
			);
			return response.data;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Logout user (client-side only for JWT)
	 * Note: For JWT-based auth, logout is handled client-side by clearing tokens
	 * No backend endpoint is needed unless implementing token blacklisting
	 */
	async logout(): Promise<void> {
		// For JWT auth, logout is handled client-side
		// Just return - token clearing is handled by the auth store
		return Promise.resolve();
	}

	/**
	 * Decode JWT token to extract user information
	 */
	private decodeTokenPayload(token: string): User {
		try {
			// JWT format: header.payload.signature
			const parts = token.split('.');
			if (parts.length !== 3) {
				throw new Error('Invalid JWT format');
			}

			// Decode base64 payload
			const payload = JSON.parse(
				atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
			);

			return {
				id: payload.user_id?.toString() || '',
				email: payload.email || '',
				name: payload.name || '',
			};
		} catch (error) {
			console.error('Error decoding JWT:', error);
			// Return empty user if decode fails
			return {
				id: '',
				email: '',
				name: '',
			};
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
export const authService = new AuthService();
