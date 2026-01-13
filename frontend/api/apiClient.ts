import axios from 'axios';
import { useAuthStore } from '../hooks/useAuthStore';
import { tokenStorage } from './tokenStorage';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
	async (config) => {
		// First try to get the access token from the Zustand store
		let accessToken = useAuthStore.getState().accessToken;

		// If not available in store, try to get it from storage
		if (!accessToken) {
			accessToken = await tokenStorage.getAccessToken();
			// Update the store with the token if found
			if (accessToken) {
				useAuthStore.setState({ accessToken });
			}
		}

		// If the access token exists, add it to the Authorization header
		if (accessToken) {
			config.headers.Authorization = `Bearer ${accessToken}`;
		}

		// Must return the config object, otherwise the request will be blocked
		return config;
	},
	(error) => {
		// Handle request errors here
		return Promise.reject(error);
	}
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
	(response) => {
		// If the response is successful, just return it
		return response;
	},
	async (error) => {
		const originalRequest = error.config;

		// Don't try to refresh tokens for auth endpoints (login, register, refresh)
		const isAuthEndpoint = originalRequest.url?.includes('/profiles/login/') || 
							   originalRequest.url?.includes('/profiles/register/') ||
							   originalRequest.url?.includes('/profiles/refresh/') ||
							   originalRequest.url?.includes('/profiles/auth/google/');

		// If we get a 401 error and haven't already tried to refresh
		// AND it's not an auth endpoint (where 401 means invalid credentials)
		if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
			originalRequest._retry = true;

			try {
				const { refreshToken } = await tokenStorage.getTokens();
				
				if (refreshToken) {
					// Try to refresh the access token
					const refreshResponse = await axios.post(
						`${process.env.EXPO_PUBLIC_BASE_URL}/profiles/refresh/`,
						{ refresh: refreshToken }
					);

					const newAccessToken = refreshResponse.data.access;
					
					// Update tokens in storage and store
					await tokenStorage.setAccessToken(newAccessToken);
					useAuthStore.getState().accessToken = newAccessToken;

					// Retry the original request with new token
					originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
					return apiClient(originalRequest);
				} else {
					// No refresh token, sign out user
					await useAuthStore.getState().signOut();
				}
			} catch (refreshError) {
				// Refresh failed, sign out user
				console.error('Token refresh failed:', refreshError);
				await useAuthStore.getState().signOut();
			}
		}

		return Promise.reject(error);
	}
);

export default apiClient;
