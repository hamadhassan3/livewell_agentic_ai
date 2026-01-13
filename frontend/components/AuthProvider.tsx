import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getQuestion } from '@/api/questionnaireService';
import { QuestionnaireState } from '@/types/questionnaireTypes';
import { COLORS } from '@/constants/theme';

interface AuthProviderProps {
	children: React.ReactNode;
}

/**
 * AuthProvider - Global authentication and routing guard
 *
 * This component:
 * 1. Initializes auth state from storage on app launch
 * 2. Checks questionnaire completion status for authenticated users
 * 3. Redirects users to appropriate screens based on auth/questionnaire state
 * 4. Protects routes - prevents unauthorized access to protected screens
 */
export function AuthProvider({ children }: AuthProviderProps) {
	const { isAuthenticated, isInitialized, initializeAuth } = useAuthStore();
	const [isLoading, setIsLoading] = useState(true);
	const [questionnaireState, setQuestionnaireState] = useState<QuestionnaireState | null>(null);
	const [questionnaireLoading, setQuestionnaireLoading] = useState(false);
	const router = useRouter();
	const segments = useSegments();

	// Step 1: Initialize auth on app launch
	useEffect(() => {
		const initialize = async () => {
			try {
				console.log('[AuthProvider] Initializing auth...');
				await initializeAuth();
				console.log('[AuthProvider] Auth initialized successfully');
			} catch (error) {
				console.error('[AuthProvider] Failed to initialize auth:', error);
			} finally {
				setIsLoading(false);
			}
		};

		initialize();
	}, [initializeAuth]);

	// Step 2: Reset questionnaire state when user logs out
	useEffect(() => {
		if (!isAuthenticated) {
			setQuestionnaireState(null);
			setQuestionnaireLoading(false);
			console.log('[AuthProvider] User logged out - questionnaire state reset');
		}
	}, [isAuthenticated]);

	// Step 3: Check questionnaire state when user is authenticated
	useEffect(() => {
		const checkQuestionnaireState = async () => {
			if (isAuthenticated && !questionnaireLoading && !questionnaireState) {
				setQuestionnaireLoading(true);
				try {
					console.log('[AuthProvider] Checking questionnaire state...');
					const data = await getQuestion();
					setQuestionnaireState(data);
					console.log('[AuthProvider] Questionnaire state:', data.is_completed ? 'completed' : 'incomplete');
				} catch (error) {
					console.error('[AuthProvider] Failed to load questionnaire state:', error);
				} finally {
					setQuestionnaireLoading(false);
				}
			}
		};

		checkQuestionnaireState();
	}, [isAuthenticated, questionnaireLoading, questionnaireState]);

	// Step 4: Route protection and navigation logic
	useEffect(() => {
		if (!isInitialized || isLoading) {
			// Wait for auth to initialize
			return;
		}

		const inAuthGroup = segments[0] === '(auth)';
		const inTabsGroup = segments[0] === '(tabs)';
		const isRootIndex = segments.length === 0 || (segments.length === 1 && segments[0] === 'index');

		console.log('[AuthProvider] Route protection check:', {
			isAuthenticated,
			segments,
			inAuthGroup,
			inTabsGroup,
			isRootIndex,
			questionnaireComplete: questionnaireState?.is_completed
		});

		if (!isAuthenticated) {
			// User is not authenticated
			if (!inAuthGroup && !isRootIndex) {
				// Trying to access protected routes - redirect to index (will show login)
				console.log('[AuthProvider] Unauthorized access attempt, redirecting to login');
				router.replace('/');
			}
		} else {
			// User is authenticated
			if (questionnaireLoading) {
				// Still checking questionnaire state
				return;
			}

			if (questionnaireState?.is_completed) {
				// Questionnaire is completed - can access tabs
				if (inAuthGroup || isRootIndex) {
					// Redirect authenticated users away from login/index to tabs
					console.log('[AuthProvider] User authenticated and questionnaire complete, redirecting to tabs');
					router.replace('/(tabs)');
				}
			} else {
				// Questionnaire not completed - must complete it first
				if (inTabsGroup) {
					// Trying to access tabs without completing questionnaire - redirect to index
					console.log('[AuthProvider] Questionnaire incomplete, redirecting from tabs to questionnaire');
					router.replace('/');
				}
			}
		}
	}, [isInitialized, isLoading, isAuthenticated, questionnaireState, questionnaireLoading, segments, router]);

	// Show loading screen while initializing auth or checking questionnaire
	if (isLoading || !isInitialized || (isAuthenticated && questionnaireLoading && !questionnaireState)) {
		console.log('[AuthProvider] Showing loading screen');
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size='large' color={COLORS.primary} />
			</View>
		);
	}

	// Auth is initialized - render children
	return <>{children}</>;
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: COLORS.background,
	},
});
