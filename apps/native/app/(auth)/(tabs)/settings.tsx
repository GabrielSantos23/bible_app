import { LanguageSettingItem } from "@/components/config/LanguageSettingItem";
import { LogoutItem } from "@/components/config/LogoutItem";
import { NotificationSettingItem } from "@/components/config/NotificationSettingItem";
import { ThemeSettingItem } from "@/components/config/ThemeSettingItem";
import { Container } from "@/components/container";
import { Text, View, Pressable } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { useQuery } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { useTranslation } from 'react-i18next';
import { authClient } from "@/lib/auth-client";

export default function SettingsScreen() {
	const { t } = useTranslation();
	const router = useRouter();
	const foregroundColor = useThemeColor("foreground");
	const mutedColor = useThemeColor("muted");
	const primaryColor = useThemeColor("primary" as any);
	const userData = useQuery(api.auth.getCurrentUser);
	const userName = userData?.name || t('common.user');
	const userEmail = userData?.email || "";
	const backgroundColor = useThemeColor("background");

	// Gerar iniciais do nome
	const getInitials = (name: string) => {
		const parts = name.split(" ");
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	};

	const handleLogout = async () => {
		await authClient.signOut();
		router.replace("/login");
	};

	return (
			<ScrollView style={{backgroundColor}} className="flex-1" contentContainerClassName="pb-6">
				{/* Header */}
				<View className="px-6 pt-4 pb-6">
					<Pressable
						onPress={() => router.back()}
						className="mb-4"
					>
						<Ionicons name="arrow-back" size={24} color={foregroundColor} />
					</Pressable>
					<Text className="text-2xl font-bold text-foreground text-center">
						{t('settings.appSettings')}
					</Text>
				</View>

				{/* User Profile Section */}
				<View className="items-center mb-8 px-6">
					<View
						className="w-20 h-20 rounded-full items-center justify-center mb-3"
						style={{ backgroundColor: primaryColor }}
					>
						<Text className="text-2xl font-bold text-black">
							{getInitials(userName)}
						</Text>
					</View>
					<Text className="text-lg capitalize font-semibold text-foreground mb-1">
						{userName}
					</Text>
					
				</View>

				{/* Settings List */}
				<View className="px-6 flex-col gap-y-3">
					<ThemeSettingItem />
					<LanguageSettingItem />
					<NotificationSettingItem />
					<LogoutItem onLogout={handleLogout} />
				</View>
			</ScrollView>
	);
}