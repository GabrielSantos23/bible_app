import { Text, View, TouchableOpacity } from "react-native";
import { Container } from "@/components/container";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { Card, Chip, useThemeColor } from "heroui-native";

export default function Home() {
	const healthCheck = useQuery(api.healthCheck.get);
	const { isAuthenticated } = useConvexAuth();
	const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
	const mutedColor = useThemeColor("muted");
	const successColor = useThemeColor("success");
	const dangerColor = useThemeColor("danger");

	const isConnected = healthCheck === "OK";
	const isLoading = healthCheck === undefined;

	return (
		<Container className="p-6">
			<View className="py-4 mb-6">
				<Text className="text-4xl font-bold text-foreground mb-2">
					BETTER T STACK
				</Text>
			</View>

			{user ? (
				<Card variant="secondary" className="p-4 mb-4">
					<View className="mb-2">
						<Text className="text-foreground text-base">
							Welcome, <Text className="font-semibold">{user.name}</Text>
						</Text>
					</View>
					<Text className="text-muted text-sm mb-4">{user.email}</Text>
					<TouchableOpacity
						className="bg-danger px-4 py-2 rounded-md self-start"
						onPress={() => {
							authClient.signOut();
						}}
					>
						<Text className="text-danger-foreground font-medium">Sign Out</Text>
					</TouchableOpacity>
				</Card>
			) : null}
			<Card variant="secondary" className="p-4 mb-4">
				<Text className="text-foreground font-medium mb-2">API Status</Text>
				<View className="flex-row items-center gap-2">
					<View
						className={`w-3 h-3 rounded-full ${healthCheck === "OK" ? "bg-success" : "bg-danger"}`}
					/>
					<Text className="text-muted">
						{healthCheck === undefined
							? "Checking..."
							: healthCheck === "OK"
								? "Connected to API"
								: "API Disconnected"}
					</Text>
				</View>
			</Card>
			{!user && (
				<>
					<SignIn />
					<SignUp />
				</>
			)}
		</Container>
	);
}
