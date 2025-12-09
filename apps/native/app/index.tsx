import { Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";
import { ActivityIndicator, View } from "react-native";
import { useThemeColor } from "heroui-native";

export default function Index() {
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

	if (isAuthenticated) {
		return <Redirect href="/(auth)/(tabs)" />;
	}

	return <Redirect href="/login" />;
}






