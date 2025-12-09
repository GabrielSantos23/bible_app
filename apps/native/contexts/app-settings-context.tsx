import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import i18n from "@/lib/i18n";

type AppLanguage = "pt" | "en";
type NotificationScheduleType = "instant" | "scheduled";

type AppSettingsContextType = {
	language: AppLanguage;
	setLanguage: (language: AppLanguage) => void;
	// Notificações
	notificationsEnabled: boolean;
	setNotificationsEnabled: (enabled: boolean) => void;
	notificationScheduleType: NotificationScheduleType;
	setNotificationScheduleType: (type: NotificationScheduleType) => void;
	notificationScheduledTime: string; // formato "HH:mm"
	setNotificationScheduledTime: (time: string) => void;
};

const LANGUAGE_STORAGE_KEY = "app_language_preference";
const NOTIFICATIONS_ENABLED_KEY = "app_notifications_enabled";
const NOTIFICATION_SCHEDULE_TYPE_KEY = "app_notification_schedule_type";
const NOTIFICATION_SCHEDULED_TIME_KEY = "app_notification_scheduled_time";

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(
	undefined,
);

export const AppSettingsProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [language, setLanguageState] = useState<AppLanguage>("pt");
	const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(false);
	const [notificationScheduleType, setNotificationScheduleTypeState] = useState<NotificationScheduleType>("instant");
	const [notificationScheduledTime, setNotificationScheduledTimeState] = useState<string>("08:00");
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		const loadSavedSettings = async () => {
			try {
				// Carrega idioma
				const savedLanguage = await SecureStore.getItemAsync(
					LANGUAGE_STORAGE_KEY,
				);
				if (savedLanguage === "pt" || savedLanguage === "en") {
					setLanguageState(savedLanguage);
					i18n.changeLanguage(savedLanguage);
				}

				// Carrega configurações de notificação
				const savedNotificationsEnabled = await SecureStore.getItemAsync(
					NOTIFICATIONS_ENABLED_KEY,
				);
				if (savedNotificationsEnabled === "true") {
					setNotificationsEnabledState(true);
				}

				const savedScheduleType = await SecureStore.getItemAsync(
					NOTIFICATION_SCHEDULE_TYPE_KEY,
				);
				if (savedScheduleType === "instant" || savedScheduleType === "scheduled") {
					setNotificationScheduleTypeState(savedScheduleType);
				}

				const savedScheduledTime = await SecureStore.getItemAsync(
					NOTIFICATION_SCHEDULED_TIME_KEY,
				);
				if (savedScheduledTime) {
					setNotificationScheduledTimeState(savedScheduledTime);
				}
			} catch (error) {
				console.error("Erro ao carregar configurações salvas:", error);
			} finally {
				setIsInitialized(true);
			}
		};

		loadSavedSettings();
	}, []);

	const setLanguage = useCallback(async (newLanguage: AppLanguage) => {
		setLanguageState(newLanguage);
		i18n.changeLanguage(newLanguage);
		try {
			await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, newLanguage);
		} catch (error) {
			console.error("Erro ao salvar idioma:", error);
		}
	}, []);

	const setNotificationsEnabled = useCallback(async (enabled: boolean) => {
		setNotificationsEnabledState(enabled);
		try {
			await SecureStore.setItemAsync(NOTIFICATIONS_ENABLED_KEY, enabled.toString());
		} catch (error) {
			console.error("Erro ao salvar configuração de notificações:", error);
		}
	}, []);

	const setNotificationScheduleType = useCallback(async (type: NotificationScheduleType) => {
		setNotificationScheduleTypeState(type);
		try {
			await SecureStore.setItemAsync(NOTIFICATION_SCHEDULE_TYPE_KEY, type);
		} catch (error) {
			console.error("Erro ao salvar tipo de agendamento:", error);
		}
	}, []);

	const setNotificationScheduledTime = useCallback(async (time: string) => {
		setNotificationScheduledTimeState(time);
		try {
			await SecureStore.setItemAsync(NOTIFICATION_SCHEDULED_TIME_KEY, time);
		} catch (error) {
			console.error("Erro ao salvar horário agendado:", error);
		}
	}, []);

	const value = useMemo(
		() => ({
			language,
			setLanguage,
			notificationsEnabled,
			setNotificationsEnabled,
			notificationScheduleType,
			setNotificationScheduleType,
			notificationScheduledTime,
			setNotificationScheduledTime,
		}),
		[
			language,
			setLanguage,
			notificationsEnabled,
			setNotificationsEnabled,
			notificationScheduleType,
			setNotificationScheduleType,
			notificationScheduledTime,
			setNotificationScheduledTime,
		],
	);

	// Evita piscar idioma padrão antes de carregar o salvo
	if (!isInitialized) {
		return null;
	}

	return (
		<AppSettingsContext.Provider value={value}>
			{children}
		</AppSettingsContext.Provider>
	);
};

export function useAppSettings() {
	const context = useContext(AppSettingsContext);
	if (!context) {
		throw new Error("useAppSettings must be used within AppSettingsProvider");
	}
	return context;
}






