import { AuthProvider } from '@/components/AuthProvider';
import { COLORS } from '@/constants/theme';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Custom theme matching our app colors from theme.ts
const AppTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		primary: COLORS.primary,
		background: COLORS.background,
		card: COLORS.surface,
		text: COLORS.textPrimary,
		border: COLORS.border,
		notification: COLORS.primary,
	},
};

export default function RootLayout() {
	const [loaded] = useFonts({
		SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
	});

	if (!loaded) {
		// Async font loading only occurs in development.
		return null;
	}

	return (
		<ThemeProvider value={AppTheme}>
			<AuthProvider>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name='index' />
					<Stack.Screen name='(auth)' />
					<Stack.Screen name='(tabs)' />
					<Stack.Screen name='+not-found' />
				</Stack>
				<StatusBar style='dark' />
			</AuthProvider>
		</ThemeProvider>
	);
}
