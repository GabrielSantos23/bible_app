import { Text, View, Platform, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Accordion, useThemeColor, Switch, Select, RadioGroup, cn, useSelect } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSettings } from "@/contexts/app-settings-context";
import { ChevronDown } from "lucide-react-native";
import React from "react";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useTranslation } from 'react-i18next';

// Animated trigger component for the Select
const AnimatedSelectTrigger = ({ placeholder }: { placeholder: string }) => {
	const { progress } = useSelect();
	const primaryColor = useThemeColor("primary" as any);
	const mutedColor = useThemeColor("muted");

	const rContainerStyle = useAnimatedStyle(() => {
		const opacity = interpolate(progress.value, [0, 1, 2], [0, 1, 0]);
		return {
			opacity,
		};
	});

	const rChevronStyle = useAnimatedStyle(() => {
		const rotate = interpolate(progress.value, [0, 1, 2], [0, -180, 0]);
		return {
			transform: [{ rotate: `${rotate}deg` }],
		};
	});

	return (
		<View
			className="bg-card h-12 px-3 rounded-lg justify-center"
			style={styles.borderCurve}
		>
			<Animated.View
				style={[
					rContainerStyle,
					styles.borderCurve,
					{
						position: 'absolute',
						top: -1,
						left: -1,
						right: -1,
						bottom: -1,
						borderWidth: 2.5,
						borderColor: primaryColor,
						borderRadius: 8,
						pointerEvents: 'none',
					}
				]}
			/>
			<Select.Value placeholder={placeholder} />
			<Animated.View style={[rChevronStyle, { position: 'absolute', right: 12 }]}>
				<ChevronDown color={mutedColor} size={18} />
			</Animated.View>
		</View>
	);
};

export function NotificationSettingItem() {
	const { t } = useTranslation();
	const {
		notificationsEnabled,
		setNotificationsEnabled,
		notificationScheduleType,
		setNotificationScheduleType,
		notificationScheduledTime,
		setNotificationScheduledTime,
	} = useAppSettings();
	const mutedColor = useThemeColor("muted");
	const borderColor = useThemeColor("border");
	const primaryColor = useThemeColor("primary" as any);
	const cardBackground = useThemeColor("background");

	const timeOptions = React.useMemo(() =>
		Array.from({ length: 48 }, (_, i) => {
			const hours = Math.floor(i / 2);
			const minutes = (i % 2) * 30;
			const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
			return {
				value: timeString,
				label: timeString,
			};
		}), []);

	// Encontra a opção de horário selecionada
	const selectedTimeOption = React.useMemo(
		() =>
			timeOptions.find(
				(option) => option.value === notificationScheduledTime
			) || timeOptions[0],
		[notificationScheduledTime, timeOptions]
	);

	const openItems = notificationsEnabled ? ["notifications"] : [];

	return (
		<>
			<Accordion
				selectionMode="single"
				variant="surface"
				className="mb-1 bg-transparent rounded-2xl border-muted-foreground/40 border"
				value={openItems}
				onValueChange={() => {}} 
			>
				<Accordion.Item value="notifications">
					<Accordion.Trigger>
						<View className="flex-row items-center flex-1">
							<View className="w-5" />
							<View className="flex-1">
								<Text className="text-foreground text-base font-semibold">
									{t('settings.notifications')}
								</Text>
								<Text className="text-muted text-sm">
									{t('settings.notificationsDescription')}
								</Text>
							</View>
						</View>
						<Switch
							isSelected={notificationsEnabled}
							onSelectedChange={setNotificationsEnabled}
							animation={{
								backgroundColor: {
									value: [mutedColor, primaryColor],
								},
							}}
						/>
					</Accordion.Trigger>
					{notificationsEnabled && (
						<Accordion.Content>
							<View className="py-2">
								<Text className="text-foreground text-sm font-medium mb-3">
									{t('settings.whenReceiveNotification')}
								</Text>

								<RadioGroup
									value={notificationScheduleType}
									onValueChange={(value) => {
										if (value === "instant" || value === "scheduled") {
											setNotificationScheduleType(value);
										}
									}}
									className="mb-3"
								>
									<RadioGroup.Item value="instant">
										{({ isSelected }) => (
											<>
												<View className="flex-1">
													<RadioGroup.Label>{t('settings.instantly')}</RadioGroup.Label>
													<RadioGroup.Description>
														{t('settings.instantlyDescription')}
													</RadioGroup.Description>
												</View>
												<RadioGroup.Indicator
													className={cn(
														'size-4',
														'border',
														isSelected ? 'bg-primary border-primary' : 'border-muted'
													)}
												/>
											</>
										)}
									</RadioGroup.Item>

									<View
										className="h-px my-2"
										style={{ backgroundColor: borderColor }}
									/>

									<RadioGroup.Item value="scheduled">
										{({ isSelected }) => (
											<>
												<View className="flex-1">
													<RadioGroup.Label>{t('settings.scheduled')}</RadioGroup.Label>
													<RadioGroup.Description>
														{t('settings.scheduledDescription')}
													</RadioGroup.Description>
												</View>
												<RadioGroup.Indicator
													className={cn(
														'size-4',
														'border',
														isSelected ? 'bg-primary border-primary' : 'border-muted'
													)}
												/>
											</>
										)}
									</RadioGroup.Item>
								</RadioGroup>

								{notificationScheduleType === "scheduled" && (
									<View className="mt-3">
										<Text className="text-foreground text-sm font-medium mb-2">
											{t('settings.notificationTime')}
										</Text>
										<Select
											value={selectedTimeOption}
											onValueChange={(option) => {
												if (option && typeof option === 'object' && 'value' in option) {
													setNotificationScheduledTime(option.value as string);
												}
											}}
										>
											<Select.Trigger className="w-full">
												<AnimatedSelectTrigger placeholder={t('settings.chooseTime')} />
											</Select.Trigger>
											<Select.Portal>
												<Select.Overlay />
												<Select.Content 
													presentation="popover"
													placement="bottom"
													align="start"
													width="trigger"
													offset={8}
													className="rounded-lg"
													style={{ backgroundColor: cardBackground }}
												>
													<View style={{ maxHeight: 300, width: '100%' }}>
														<ScrollView 
															showsVerticalScrollIndicator={true}
															keyboardShouldPersistTaps="handled"
															contentContainerStyle={{ alignItems: 'center' }}
															nestedScrollEnabled={true}
															scrollEnabled={true}
															bounces={false}
															{...(Platform.OS === 'android' && {
																overScrollMode: 'never',
															})}
														>
															{timeOptions.map((option) => (
																<Select.Item
																	key={option.value}
																	value={option.value}
																	label={option.label}
																	className="w-full flex-row items-center justify-between"
																>
																	<View style={{ width: 26 }} />
																	<Text className="text-foreground text-center flex-1">{option.label}</Text>
																	<View style={{ width: 26, alignItems: 'flex-end' }}>
																		<Select.ItemIndicator 
																			iconProps={{
																				color: primaryColor,
																				size: 18,
																			}}
																		/>
																	</View>
																</Select.Item>
															))}
														</ScrollView>
													</View>
												</Select.Content>
											</Select.Portal>
										</Select>
									</View>
								)}
							</View>
						</Accordion.Content>
					)}
				</Accordion.Item>
			</Accordion>
		</>
	);
}

const styles = StyleSheet.create({
	borderCurve: {
		borderCurve: 'continuous',
	},
});