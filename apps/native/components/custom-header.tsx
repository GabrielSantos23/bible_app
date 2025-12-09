import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Image, Text, View } from "react-native";
import { useTranslation } from 'react-i18next';

function getWeatherImage() {
	const hour = new Date().getHours();
	if (hour < 12) {
		return require("@/assets/header-images/morning.png");
	}
	if (hour < 18) {
		return require("@/assets/header-images/afternoon.png");
	}
	return require("@/assets/header-images/night.png");
}

function getGreeting(t: any) {
	const hour = new Date().getHours();
	if (hour < 12) return t('home.greetingMorning');
	if (hour < 18) return t('home.greetingAfternoon');
	return t('home.greetingEvening');
}

function formatDate() {
	const date = new Date();
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function CustomHeader() {
	const { t } = useTranslation();
	const userData = useQuery(api.auth.getCurrentUser);
	const userName = userData?.name || t('common.user');

	return (
		<View className="flex-row items-center justify-between w-full px-2">
			{/* Left side: Weather icon and greeting */}
			<View className="flex-row items-center gap-3 flex-1">
				<Image
					source={getWeatherImage()}
					style={{ width: 40, height: 40 }}
					resizeMode="contain"
				/>
				<View>
					<Text className="text-foreground text-base">{getGreeting(t)}</Text>
					<Text className="text-foreground text-base font-semibold capitalize">
						{userName}
					</Text>
				</View>
			</View>

			{/* Right side: Date with underline */}
			<View className="items-end">
				<Text className="text-foreground text-base">{formatDate()}</Text>
				<View
					className="h-0.5 mt-0.5 w-full"
					style={{ backgroundColor: "#2D5016" }}
				/>
			</View>
		</View>
	);
}

