import { authClient } from "@/lib/auth-client";
import { useState, useCallback, useRef } from "react";
import {
	ActivityIndicator,
	Text,
	TextInput,
	Pressable,
	View,
	StyleSheet,
} from "react-native";
import { Button, useThemeColor } from "heroui-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
	Easing,
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Uniwind, useUniwind, withUniwind } from "uniwind";
import { useTranslation } from 'react-i18next';

const BG = require("@/assets/images/paywall-showcase-bg.jpeg");
const Logo = require("@/assets/images/logo.png");

const AnimatedView = Animated.createAnimatedComponent(View);
const StyledFeather = withUniwind(Feather);
const StyledIonicons = withUniwind(Ionicons);

export function SignIn() {
	const { t } = useTranslation();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const mutedColor = useThemeColor("muted");
	const foregroundColor = useThemeColor("foreground");
	const dangerColor = useThemeColor("danger");

	const { theme } = useUniwind();
	const prevTheme = useRef(theme);

	useFocusEffect(
		useCallback(() => {
			prevTheme.current = theme;
			Uniwind.setTheme("dark");
			return () => {
				Uniwind.setTheme(prevTheme.current);
			};
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [])
	);

	const handleLogin = async () => {
		if (!email.trim() || !password.trim()) {
			setError(t('auth.fillAllFields'));
			return;
		}

		setIsLoading(true);
		setError(null);

		await authClient.signIn.email(
			{
				email,
				password,
			},
			{
				onError: (error) => {
					setError(error.error?.message || t('auth.signInFailed'));
					setIsLoading(false);
				},
				onSuccess: () => {
					setEmail("");
					setPassword("");
					router.replace("/(auth)/(tabs)");
				},
				onFinished: () => {
					setIsLoading(false);
				},
			}
		);
	};

	return (
		<View
			className="flex-1 bg-black px-6"
			style={{
				paddingTop: insets.top + 12,
				paddingBottom: insets.bottom + 12,
			}}
		>
			<Animated.View
				style={StyleSheet.absoluteFill}
				entering={FadeInUp.duration(1000)}
			>
				<Image source={BG} style={StyleSheet.absoluteFill} blurRadius={50} />
			</Animated.View>

			<Animated.View entering={FadeIn.duration(1000)}>
				<View className="relative items-center justify-center" style={{ minHeight: 80, marginBottom: 8 }}>
					<Pressable
						className="absolute top-0 left-0 z-50"
						onPress={() => router.back()}
						hitSlop={16}
					>
						<StyledFeather
							name="chevron-left"
							size={28}
							className="text-white"
						/>
					</Pressable>
				<Text className="text-sm text-background font-medium text-center tracking-wider uppercase mt-3">
					{t('auth.signInToAccount')}
				</Text>
					<Image
						source={Logo}
						style={styles.logo}
						contentFit="contain"
						transition={200}
					/>
				</View>
			</Animated.View>

			<AnimatedView
				entering={FadeInDown.duration(500)
					.delay(500)
					.easing(Easing.out(Easing.ease))}
				className="flex-1 justify-end"
			>
				{error && (
					<View className="mb-4 p-3 bg-danger/20 rounded-lg border border-danger/40">
						<Text className="text-danger text-sm text-center">{error}</Text>
					</View>
				)}

				<View className="mb-4">
					<View
						className="rounded-full px-4 py-4 mb-4 border border-white/20 bg-white/10"
						style={{
							backgroundColor: "rgba(255, 255, 255, 0.1)",
						}}
					>
					
						<TextInput
							value={email}
							onChangeText={setEmail}
							placeholder={t('auth.enterEmail')}
							placeholderTextColor="rgba(255, 255, 255, 0.5)"
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
							className="text-white text-base"
							style={{ color: "#ffffff" }}
						/>
					</View>

					<View
						className="rounded-full px-4 py-4 mb-6 border border-white/20 bg-white/10"
						style={{
							backgroundColor: "rgba(255, 255, 255, 0.1)",
						}}
					>
					
						<TextInput
							value={password}
							onChangeText={setPassword}
							placeholder={t('auth.enterPassword')}
							placeholderTextColor="rgba(255, 255, 255, 0.5)"
							secureTextEntry
							autoCapitalize="none"
							autoCorrect={false}
							className="text-white text-base"
							style={{ color: "#ffffff" }}
						/>
					</View>
				</View>

				<Button
					size="lg"
					className="rounded-full bg-white mb-5"
					onPress={handleLogin}
					isDisabled={isLoading}
					animation={{ highlight: "disabled" }}
				>
					{isLoading ? (
						<ActivityIndicator size="small" color="#000000" />
					) : (
						<Button.Label className="text-black">{t('auth.signIn')}</Button.Label>
					)}
				</Button>

				<View className="flex-row items-center justify-center mb-4">
					<Pressable onPress={() => router.push("/register")}>
						<Text className="text-sm text-muted">
							{t('auth.dontHaveAccount')}{" "}
							<Text className="text-accent font-medium">{t('auth.signUp')}</Text>
						</Text>
					</Pressable>
				</View>

				<View className="flex-row items-center justify-center">
					<Pressable onPress={() => {}}>
						<Text className="text-sm text-muted">{t('auth.termsOfUse')}</Text>
					</Pressable>
					<View className="mx-2">
						<Text className="text-muted">•</Text>
					</View>
					<Pressable onPress={() => {}}>
						<Text className="text-sm text-muted">{t('auth.privacyPolicy')}</Text>
					</Pressable>
					<View className="mx-2">
						<Text className="text-muted">•</Text>
					</View>
					<Pressable onPress={() => {}}>
						<Text className="text-sm text-muted">{t('auth.forgotPassword')}</Text>
					</Pressable>
				</View>
			</AnimatedView>
		</View>
	);
}

const styles = StyleSheet.create({
	logo: {
		width: 280,
		height: 160,
		opacity: 1,
	},
});
