import { Text, View, Pressable } from "react-native";
import { Accordion, useThemeColor } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from 'react-i18next';

export function LanguageSettingItem() {
	const { t } = useTranslation();
	const { language, setLanguage } = useAppSettings();
	const mutedColor = useThemeColor("muted");
	const primaryColor = useThemeColor("primary" as any);

	return (
		<Accordion selectionMode="single" variant="surface"	className="mb-1 bg-transparent rounded-2xl border-muted-foreground/40 border"
>
			<Accordion.Item value="language">
				<Accordion.Trigger>
					<View className="flex-row items-center flex-1">
						<View className="w-5" />
						<View className="flex-1">
							<Text className="text-foreground text-base font-semibold">
								{t('settings.language')}
							</Text>
							<Text className="text-muted text-sm">
								{language === "pt" ? t('settings.portuguese') : t('settings.english')}
							</Text>
						</View>
					</View>
					<Accordion.Indicator />
				</Accordion.Trigger>
				<Accordion.Content>
					<View className="py-2">
						<Pressable
							onPress={() => setLanguage("pt")}
							className="flex-row items-center justify-between py-3"
						>
							<View>
								<Text className="text-foreground text-sm font-medium">
									{t('settings.portuguese')}
								</Text>
								<Text className="text-muted text-xs">
									{t('settings.portugueseDescription')}
								</Text>
							</View>
							{language === "pt" && (
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
							onPress={() => setLanguage("en")}
							className="flex-row items-center justify-between py-3"
						>
							<View>
								<Text className="text-foreground text-sm font-medium">
									{t('settings.english')}
								</Text>
								<Text className="text-muted text-xs">
									{t('settings.englishDescription')}
								</Text>
							</View>
							{language === "en" && (
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