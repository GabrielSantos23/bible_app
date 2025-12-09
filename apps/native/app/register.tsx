import { SignUp } from "@/components/sign-up";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";

export default function RegisterScreen() {
	const { isAuthenticated } = useConvexAuth();

	// Se já estiver autenticado, redirecionar
	if (isAuthenticated) {
		return <Redirect href="/(auth)/(tabs)" />;
	}

	return (
		<View className="flex-1 justify-center">
			<SignUp />
		</View>
	);
}

