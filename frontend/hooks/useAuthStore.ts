// store/useAuthStore.ts
import { create } from 'zustand';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { authService, User } from '@/api/authService';
import { profileService, UserProfile } from '@/api/profileService';
import { tokenStorage } from '@/api/tokenStorage';
import { useMedicationStore } from '@/stores/medicationStore';
import { useGoalStore } from '@/stores/goalStore';
import { fcmService } from '@/services/fcmService';
import { router } from 'expo-router';

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
const googleClientSecret = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET!;

export const googleClientId =
	Platform.OS === 'android'
		? googleAndroidClientId
		: Platform.OS === 'ios'
		? googleIosClientId
		: googleWebClientId;

const discovery = {
	authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
	tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

interface AuthState {
	user: User | null;
	isLoading: boolean;
	error: string | null;
	isAuthenticated: boolean;
	accessToken: string | null;
	refreshToken: string | null;
	isInitialized: boolean;
}

interface AuthActions {
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string, name: string) => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	signOut: () => Promise<void>;
	clearError: () => void;
	initializeAuth: () => Promise<void>;
	loadUserProfile: () => Promise<void>;
	updateUserProfile: (profileData: Partial<UserProfile>) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
	// Initial state
	user: null,
	accessToken: null,
	refreshToken: null,
	isLoading: false,
	error: null,
	isAuthenticated: false,
	isInitialized: false,

	// Initialize auth state from storage
	initializeAuth: async () => {
		try {
			const [{ accessToken, refreshToken }, userData] = await Promise.all([
				tokenStorage.getTokens(),
				tokenStorage.getUserData(),
			]);

			if (accessToken && refreshToken && userData) {
				set({
					accessToken,
					refreshToken,
					user: userData,
					isAuthenticated: true,
					isInitialized: true,
				});
			} else {
				set({ isInitialized: true });
			}
		} catch (error) {
			console.error('Error initializing auth:', error);
			set({ isInitialized: true });
		}
	},

	// Sign in with email and password
	signIn: async (email: string, password: string) => {
		set({ isLoading: true, error: null });

		try {
			const response = await authService.login({
				email,
				password,
			});

			// Store tokens and user data
			await Promise.all([
				tokenStorage.setTokens(response.access, response.refresh),
				tokenStorage.setUserData(response.user),
			]);

			set({
				user: response.user,
				accessToken: response.access,
				refreshToken: response.refresh,
				isAuthenticated: true,
				isLoading: false,
				error: null,
			});

			// Load full profile data after successful login
			console.log('Attempting to load profile data after login...');
			try {
				await get().loadUserProfile();
				console.log('Profile data loaded successfully after login');
			} catch (profileError) {
				console.warn('Failed to load profile data:', profileError);
				// Don't fail the login if profile loading fails
			}

			try {
				await fcmService.initialize();
			} catch (fcmError) {
			}

			// Return success to let the component know login succeeded
			return Promise.resolve();
		} catch (error: any) {
			const errorMessage =
				error.message || 'Failed to sign in. Please check your credentials.';

			set({
				error: errorMessage,
				isLoading: false,
				isAuthenticated: false,
				user: null,
				accessToken: null,
				refreshToken: null,
			});

			throw error;
		}
	},

	// Sign in with Google
	signInWithGoogle: async () => {
		set({ isLoading: true, error: null });

		try {
			const redirectUri = Platform.select({
				web: AuthSession.makeRedirectUri({ useProxy: false }),
				default: AuthSession.makeRedirectUri({ useProxy: true }),
			});

			const request = new AuthSession.AuthRequest({
				clientId: googleClientId,
				redirectUri,
				responseType: AuthSession.ResponseType.Code,
				usePKCE: true,
				scopes: ['openid', 'profile', 'email'],
			});

			await request.makeAuthUrlAsync(discovery);
			const result = await request.promptAsync(discovery);

			if (result.type !== 'success') {
				throw new Error(
					result.type === 'cancel' ? 'Sign-in cancelled' : 'Sign-in failed'
				);
			}

			// Exchange authorization code for tokens
			// For web platform, include client_secret; for native apps (iOS/Android), use PKCE without secret
			const exchangeConfig: any = {
				clientId: googleClientId,
				code: result.params.code,
				redirectUri,
				extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : {},
			};

			// Add client_secret for web platform only
			if (Platform.OS === 'web' && googleClientSecret) {
				exchangeConfig.clientSecret = googleClientSecret;
			}

			const tokenResponse = await AuthSession.exchangeCodeAsync(
				exchangeConfig,
				discovery
			);

			// Exchange Google access token with backend for JWT tokens
			const backendResponse = await authService.googleAuth(tokenResponse.accessToken);

			// Store tokens and user data
			await Promise.all([
				tokenStorage.setTokens(backendResponse.access, backendResponse.refresh),
				tokenStorage.setUserData(backendResponse.user),
			]);

			set({
				user: backendResponse.user,
				accessToken: backendResponse.access,
				refreshToken: backendResponse.refresh,
				isAuthenticated: true,
				isLoading: false,
				error: null,
			});

			// Load full profile data after successful login
			console.log('Attempting to load profile data after Google sign-in...');
			try {
				await get().loadUserProfile();
				console.log('Profile data loaded successfully after Google sign-in');
			} catch (profileError) {
				console.warn('Failed to load profile data:', profileError);
				// Don't fail the login if profile loading fails
			}

			try {
				await fcmService.initialize();
			} catch (fcmError) {
			}

			return Promise.resolve();
		} catch (error: any) {
			console.error('Google Sign-In Error:', error);
			set({
				error: error.message || 'Google sign-in failed',
				isLoading: false,
			});
			throw error;
		}
	},

	// Sign up
	signUp: async (email: string, password: string, name: string) => {
		set({ isLoading: true, error: null });

		try {
			const response = await authService.register({
				email,
				password,
				name: name,
			});

			console.log('Registration successful:', response);

			// Don't automatically sign in after registration
			set({
				isLoading: false,
				error: null,
			});

			return Promise.resolve();
		} catch (error: any) {
			console.error('Registration error:', error);

			const errorMessage =
				error.message || 'Failed to create account. Please try again.';

			set({
				error: errorMessage,
				isLoading: false,
				isAuthenticated: false,
				user: null,
				accessToken: null,
				refreshToken: null,
			});

			throw error;
		}
	},

	// Sign out
	signOut: async () => {
		set({ isLoading: true });

		try {
			console.log('Starting sign out process...');

			// Try to call logout on backend (best effort - don't fail if it errors)
			try {
				await authService.logout();
				console.log('Backend logout successful');
			} catch (logoutError) {
				console.warn('Backend logout failed (non-critical):', logoutError);
				// Continue with local logout even if backend fails
			}

			// Clear FCM token
			try {
				await fcmService.deleteToken();
				fcmService.cleanup();
				console.log('FCM token cleared');
			} catch (error) {
				console.warn('FCM cleanup failed:', error);
			}

			// Clear other stores' data
			try {
				// Reset medication store
				useMedicationStore.setState({ medications: [], error: null });

				// Reset goal store
				useGoalStore.setState({ goals: [], error: null });

				console.log('App stores cleared');
			} catch (error) {
				console.warn('Error clearing other stores:', error);
			}

			// Dismiss any auth sessions
			try {
				await WebBrowser.dismissAuthSession();
			} catch (error) {
				// dismissAuthSession might not be available in all versions
				console.log('WebBrowser.dismissAuthSession not available:', error);
			}

			// Clear stored data (tokens and user data)
			await tokenStorage.clearAll();
			console.log('Storage cleared');

		} catch (error) {
			console.error('Error during sign out:', error);
		}

		// Always reset auth state, even if cleanup fails
		set({
			user: null,
			accessToken: null,
			refreshToken: null,
			isAuthenticated: false,
			error: null,
			isLoading: false,
		});

		console.log('Sign out complete - user is now logged out');

		// Force a hard navigation to root
		// This ensures we break out of any nested routes
		setTimeout(() => {
			if (Platform.OS === 'web' && typeof window !== 'undefined') {
				// For web, force full page reload
				console.log('Web logout - redirecting via window.location');
				window.location.href = '/';
			} else {
				// For native, navigate to root index
				try {
					// Try to navigate to the root
					if (router.canDismiss()) {
						router.dismissAll();
					}
					router.push('/');
					console.log('Native logout - navigated to root');
				} catch (error) {
					console.log('Native navigation error, relying on state change:', error);
				}
			}
		}, 100);
	},

	// Clear error
	clearError: () => {
		set({ error: null });
	},

	// Load user profile
	loadUserProfile: async () => {
		try {
			console.log('Loading user profile...');
			const profile = await profileService.getProfile();
			console.log('Profile data received:', profile);

			// Update user with profile data
			const currentUser = get().user;
			if (currentUser) {
				const updatedUser: User = {
					...currentUser,
					// Update email and name from profile API (authoritative source)
					email: profile.email,
					name: profile.name,
					// Update profile-specific fields
					gender: profile.gender,
					date_of_birth: profile.date_of_birth,
					height: profile.height,
					weight: profile.weight,
					age: profile.age,
					bmi: profile.bmi,
				};

				console.log('Updated user with profile data:', updatedUser);
				set({ user: updatedUser });

				// Update stored user data
				await tokenStorage.setUserData(updatedUser);
				console.log('Profile data saved to storage');
			} else {
				console.warn('No current user found to update with profile data');
			}
		} catch (error: any) {
			console.error('Error loading profile:', error);
			console.error('Error details:', {
				message: error.message,
				status: error.status,
				code: error.code
			});
			throw error;
		}
	},

	// Update user profile
	updateUserProfile: async (profileData: Partial<UserProfile>) => {
		set({ isLoading: true, error: null });

		try {
			const updatedProfile = await profileService.updateProfile(profileData);
			console.log('Profile update successful:', updatedProfile);

			// Reload the complete profile data from API to get calculated fields (age, bmi)
			await get().loadUserProfile();
			console.log('Profile data reloaded from API and session updated');

			set({ isLoading: false });
		} catch (error: any) {
			console.error('Profile update failed:', error);
			const errorMessage = error.message || 'Failed to update profile.';
			set({
				error: errorMessage,
				isLoading: false,
			});
			throw error;
		}
	},
}));
