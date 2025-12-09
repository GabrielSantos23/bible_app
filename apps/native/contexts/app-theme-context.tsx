import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Uniwind, useUniwind } from "uniwind";
import * as SecureStore from "expo-secure-store";

type ThemeName = "light" | "dark";

const THEME_STORAGE_KEY = "app_theme_preference";

type AppThemeContextType = {
	currentTheme: string;
	isLight: boolean;
	isDark: boolean;
	setTheme: (theme: ThemeName) => void;
	toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(
	undefined,
);

export const AppThemeProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { theme } = useUniwind();
	const [isInitialized, setIsInitialized] = useState(false);

	// Carregar tema salvo na inicialização
	useEffect(() => {
		const loadSavedTheme = async () => {
			try {
				const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
				if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
					Uniwind.setTheme(savedTheme as ThemeName);
				}
			} catch (error) {
				console.error("Erro ao carregar tema salvo:", error);
			} finally {
				setIsInitialized(true);
			}
		};

		loadSavedTheme();
	}, []);

	const isLight = useMemo(() => {
		return theme === "light";
	}, [theme]);

	const isDark = useMemo(() => {
		return theme === "dark";
	}, [theme]);

	const setTheme = useCallback(async (newTheme: ThemeName) => {
		Uniwind.setTheme(newTheme);
		try {
			await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
		} catch (error) {
			console.error("Erro ao salvar tema:", error);
		}
	}, []);

	const toggleTheme = useCallback(async () => {
		const newTheme = theme === "light" ? "dark" : "light";
		Uniwind.setTheme(newTheme);
		try {
			await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
		} catch (error) {
			console.error("Erro ao salvar tema:", error);
		}
	}, [theme]);

	const value = useMemo(
		() => ({
			currentTheme: theme,
			isLight,
			isDark,
			setTheme,
			toggleTheme,
		}),
		[theme, isLight, isDark, setTheme, toggleTheme],
	);

	return (
		<AppThemeContext.Provider value={value}>
			{children}
		</AppThemeContext.Provider>
	);
};

export function useAppTheme() {
	const context = useContext(AppThemeContext);
	if (!context) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}
	return context;
}
