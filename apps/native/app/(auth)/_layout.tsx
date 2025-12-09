import { Redirect, Stack } from "expo-router";
import { useConvexAuth } from "convex/react";
import { ActivityIndicator, View } from "react-native";
import { useThemeColor } from "heroui-native";

export default function AuthLayout() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const backgroundColor = useThemeColor("background");

	if (isLoading) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor,
				}}
			>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (!isAuthenticated) {
		return <Redirect href="/login" />;
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="verse-details" options={{ headerShown: false }} />
		</Stack>
	);
}

