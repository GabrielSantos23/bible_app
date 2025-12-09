import { Text, View, Pressable } from "react-native";
import { Accordion, useThemeColor, Switch } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useTranslation } from 'react-i18next';

export function ThemeSettingItem() {
	const { t } = useTranslation();
	const { currentTheme, isLight, toggleTheme } = useAppTheme();
	const foregroundColor = useThemeColor("foreground");
	const mutedColor = useThemeColor("muted");
	const primaryColor = useThemeColor("primary" as any);

	return (
		<Accordion selectionMode="single" variant="surface" className="mb-1 bg-transparent rounded-2xl border-muted-foreground/40 border" >
			<Accordion.Item value="theme">
				<Accordion.Trigger>
					<View className="flex-row items-center flex-1">
						<Ionicons
							name="person-outline"
							size={20}
							color={primaryColor}
							style={{ marginRight: 12 }}
						/>
						<View className="flex-1">
							<Text className="text-foreground text-base font-semibold">
								{t('settings.theme')}
							</Text>
							<Text className="text-muted text-sm">
								{currentTheme === "light" ? t('settings.light') : t('settings.dark')}
							</Text>
						</View>
					</View>
					<Accordion.Indicator />
				</Accordion.Trigger>
				<Accordion.Content>
					<View className="py-2">
						<Pressable
							onPress={() => {
								if (currentTheme !== "light") {
									toggleTheme();
								}
							}}
							className="flex-row items-center justify-between py-3"
						>
							<View>
								<Text className="text-foreground text-sm font-medium">
									{t('settings.light')}
								</Text>
								<Text className="text-muted text-xs">
									{t('settings.lightDescription')}
								</Text>
							</View>
							{currentTheme === "light" && (
								<Ionicons
									name="checkmark"
									size={18}
									color={primaryColor}
								/>
							)}
						</Pressable>
						<View
							className="h-px my-1"
							style={{ backgroundColor: mutedColor }}
						/>
						<Pressable
							onPress={() => {
								if (currentTheme !== "dark") {
									toggleTheme();
								}
							}}
							className="flex-row items-center justify-between py-3"
						>
							<View>
								<Text className="text-foreground text-sm font-medium">
									{t('settings.dark')}
								</Text>
								<Text className="text-muted text-xs">
									{t('settings.darkDescription')}
								</Text>
							</View>
							{currentTheme === "dark" && (
								<Ionicons
									name="checkmark"
									size={18}
									color={primaryColor}
								/>
							)}
						</Pressable>
					</View>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	);
}