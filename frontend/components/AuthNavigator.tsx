// components/AuthNavigator.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SignInScreen } from '../screens/SignInScreen';
import { SignUpScreen } from '../screens/SignUpScreen';

type AuthScreen = 'signin' | 'signup';

interface AuthNavigatorProps {
	onAuthSuccess?: () => void; // Callback when authentication is successful
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({
	onAuthSuccess,
}) => {
	const [currentScreen, setCurrentScreen] = useState<AuthScreen>('signin');

	const navigateToSignUp = () => setCurrentScreen('signup');
	const navigateToSignIn = () => setCurrentScreen('signin');

	const handleSuccessfulLogin = () => {
		// Call the parent component's callback to navigate to the main app
		if (onAuthSuccess) {
			onAuthSuccess();
		}
	};

	return (
		<View style={styles.container}>
			{currentScreen === 'signin' ? (
				<SignInScreen
					onNavigateToSignUp={navigateToSignUp}
					onSuccessfulLogin={handleSuccessfulLogin}
				/>
			) : (
				<SignUpScreen onNavigateToSignIn={navigateToSignIn} />
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
