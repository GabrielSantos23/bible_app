import { Platform } from "react-native";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { DailyLoginTracker } from "@/components/daily-login-tracker";
import CustomHeader from "@/components/custom-header";
import { HomeIcon } from "@/assets/icons/home-icon";
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
	const { t } = useTranslation();
	const themeColorBackground = useThemeColor("background");
	const themeColorForeground = useThemeColor("foreground");
	const themeColorPrimary = useThemeColor("primary" as any);

	if (Platform.OS === "ios") {
		return (
			<>
				<DailyLoginTracker />
				<NativeTabs>
					<NativeTabs.Trigger name="index">
						<Label>{t('tabs.home')}</Label>
						<Icon sf="house.fill" drawable="ic_menu_home" />
					</NativeTabs.Trigger>
					<NativeTabs.Trigger name="two">
						<Label>{t('tabs.search')}</Label>
						<Icon sf="magnifyingglass" drawable="ic_menu_search" />
					</NativeTabs.Trigger>
					<NativeTabs.Trigger name="stats">
						<Label>{t('tabs.stats', { defaultValue: 'Streak' })}</Label>
						<Icon sf="flame.fill" drawable="ic_menu_search" />
					</NativeTabs.Trigger>
					<NativeTabs.Trigger name="saved">
						<Label>{t('tabs.saved')}</Label>
						<Icon sf="heart.fill" drawable="ic_menu_search" />
					</NativeTabs.Trigger>
					<NativeTabs.Trigger name="settings">
						<Label>{t('tabs.settings')}</Label>
						<Icon sf="gearshape.fill" drawable="ic_menu_preferences" />
					</NativeTabs.Trigger>
				</NativeTabs>
			</>
		);
	}

	return (
		<>
			<DailyLoginTracker />
			<Tabs
				screenOptions={{
					headerShown: false,
				
					headerLeft: () => null,
					headerRight: () => null,
					headerStyle: {
						backgroundColor: themeColorBackground,
					},
					headerTintColor: themeColorForeground,
					headerTitleStyle: {
						color: themeColorForeground,
						fontWeight: "600",
					},
					tabBarStyle: {
						backgroundColor: themeColorBackground,
					},
					tabBarShowLabel: false,
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						title: t('tabs.home'),
						tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
							<HomeIcon 
								size={size} 
								color={focused ? themeColorPrimary : themeColorForeground} 
								fill={focused ? themeColorPrimary : themeColorForeground} 
							/>
						),
					}}
				/>
				<Tabs.Screen
					name="two"
					options={{
						title: t('tabs.search'),
						tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
							<Ionicons 
								name="search" 
								size={size} 
								color={focused ? themeColorPrimary : themeColorForeground} 
							/>
						),
					}}
				/>
				<Tabs.Screen
					name="stats"
					options={{
						title: t('tabs.stats', { defaultValue: 'Streak' }),
						tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
							<Ionicons 
								name="flame" 
								size={size} 
								color={focused ? themeColorPrimary : themeColorForeground} 
							/>
						),
					}}
				/>
				<Tabs.Screen
					name="settings"
					options={{
						title: t('tabs.settings'),
						tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
							<Ionicons 
								name="settings" 
								size={size} 
								color={focused ? themeColorPrimary : themeColorForeground} 
							/>
						),
					}}
				/>
				<Tabs.Screen
					name="devotional"
					options={{
						href: null,
					}}
				/>
				<Tabs.Screen
					name="todos"
					options={{
						href: null,
					}}
				/>
				<Tabs.Screen
					name="saved"
					options={{
						title: t('tabs.saved'),
						tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
							<Ionicons 
								name="heart" 
								size={size} 
								color={focused ? themeColorPrimary : themeColorForeground} 
							/>
						),
					}}
				/>
			</Tabs>
		</>
	);
}

