import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { Text, View, Pressable } from "react-native";
import { Card } from "heroui-native";
import { Link, Redirect } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useConvexAuth } from "convex/react";

export default function LoginScreen() {
	const foregroundColor = useThemeColor("foreground");
	const accentColor = useThemeColor("accent");
	const { isAuthenticated } = useConvexAuth();

	// Se já estiver autenticado, redirecionar
	if (isAuthenticated) {
		return <Redirect href="/(auth)/(tabs)" />;
	}

	return (
			<View className="flex-1 justify-center">
				<SignIn />
			</View>
	);
}

