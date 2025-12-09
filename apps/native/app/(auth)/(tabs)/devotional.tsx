import { useState } from "react";
import {
	View,
	Text,
	ScrollView,
	ActivityIndicator,
	Alert,
	TouchableOpacity,
	RefreshControl,
	Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { Container } from "@/components/container";
import { Card, useThemeColor } from "heroui-native";
import { useAppSettings } from "@/contexts/app-settings-context";
import { VerseSummary } from "@/components/verse-summary";
import { useTranslation } from 'react-i18next';

export default function DevotionalScreen() {
	const { t } = useTranslation();
	const [refreshing, setRefreshing] = useState(false);
	const { language } = useAppSettings();
	const devotional = useQuery(api.dailyStudy.getTodayDevotional, { language });
	const fetchManual = useAction(api.dailyStudy.fetchDailyDevotionalManual);
	const isSaved = useQuery(
		api.dailyStudy.isDevotionalSaved,
		devotional ? { devotionalId: devotional._id } : "skip"
	);
	const saveDevotional = useMutation(api.dailyStudy.saveDevotional);
	const unsaveDevotional = useMutation(api.dailyStudy.unsaveDevotional);

	const primaryColor = useThemeColor("primary" as any);
	const foregroundColor = useThemeColor("foreground");
	const mutedColor = useThemeColor("muted");
	const backgroundSecondaryColor = useThemeColor("backgroundSecondary" as any);
	const successColor = useThemeColor("success");

	const isLoading = devotional === undefined;
	const isSaving = isSaved === undefined;

	const handleManualFetch = async () => {
		try {
			setRefreshing(true);
			const result = await fetchManual({});
			if (result?.success) {
				Alert.alert(t('common.success'), t('devotional.updateSuccess'));
			} else {
				Alert.alert(
					t('common.error'),
					result?.error || t('devotional.updateError')
				);
			}
		} catch (error) {
			Alert.alert(
				t('common.error'),
				error instanceof Error ? error.message : t('common.error')
			);
		} finally {
			setRefreshing(false);
		}
	};

	const handleShare = async () => {
		if (!devotional) return;

		try {
			const reference = devotional.reference || devotional.rawData?.ref || "";
			const verse = devotional.verse || devotional.rawData?.text || "";
			
			const shareText = reference
				? `${reference}\n\n"${verse}"`
				: `"${verse}"`;

			const result = await Share.share({
				message: shareText,
				title: reference || t('verseOfDay.title'),
			});

			if (result.action === Share.sharedAction) {
				// Opcional: mostrar feedback de sucesso
			}
		} catch (error) {
			Alert.alert(
				t('common.error'),
				error instanceof Error ? error.message : t('devotional.shareError')
			);
		}
	};

	const handleSave = async () => {
		if (!devotional) return;

		try {
			if (isSaved) {
				// Remover dos salvos
				await unsaveDevotional({ devotionalId: devotional._id });
				Alert.alert(t('common.success'), t('devotional.removeSuccess'));
			} else {
				// Salvar
				await saveDevotional({ devotionalId: devotional._id });
				Alert.alert(t('common.success'), t('devotional.saveSuccess'));
			}
		} catch (error) {
			Alert.alert(
				t('common.error'),
				error instanceof Error
					? error.message
					: t('devotional.saveError')
			);
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await handleManualFetch();
	};

	// Formata a data para exibição
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("pt-BR", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<Container className="flex-1">
			<ScrollView
				className="flex-1"
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={primaryColor}
					/>
				}
			>
				<View className="p-6">
					{/* Botão de teste para fetch manual */}
					<View className="mb-4">
						<TouchableOpacity
							onPress={handleManualFetch}
							disabled={refreshing}
							className="flex-row items-center justify-center p-3 rounded-lg border mb-2"
							style={{
								borderColor: primaryColor,
								backgroundColor: "transparent",
								opacity: refreshing ? 0.5 : 1,
							}}
							activeOpacity={0.7}
						>
							{refreshing ? (
								<ActivityIndicator size="small" color={primaryColor} />
							) : (
								<>
									<Ionicons
										name="refresh"
										size={16}
										color={primaryColor}
										style={{ marginRight: 8 }}
									/>
									<Text style={{ color: primaryColor, fontSize: 14 }}>
										{t('devotional.updateManually')}
									</Text>
								</>
							)}
						</TouchableOpacity>
					</View>

					{isLoading ? (
						<View className="flex-1 justify-center items-center py-20">
							<ActivityIndicator size="large" color={primaryColor} />
							<Text
								className="mt-4 text-center"
								style={{ color: mutedColor }}
							>
								{t('devotional.loadingDevotional')}
							</Text>
						</View>
					) : !devotional ? (
						<Card className="p-6">
							<View className="items-center">
								<Ionicons
									name="book-outline"
									size={64}
									color={mutedColor}
								/>
								<Text
									className="text-xl font-bold mt-4 text-center"
									style={{ color: foregroundColor }}
								>
									{t('devotional.noDevotionalAvailable')}
								</Text>
								<Text
									className="text-center mt-2"
									style={{ color: mutedColor }}
								>
									{t('devotional.fetchDevotionalMessage')}
								</Text>
							</View>
						</Card>
					) : (
						<Card className="p-6">
							{/* Cabeçalho com data */}
							<View className="mb-6">
								<Text
									className="text-sm uppercase tracking-wide mb-2"
									style={{ color: mutedColor }}
								>
									{t('devotional.dailyDevotional')}
								</Text>
								<Text
									className="text-lg font-semibold"
									style={{ color: foregroundColor }}
								>
									{formatDate(devotional.date)}
								</Text>
							</View>

							{/* Referência bíblica */}
							{(devotional.reference || devotional.rawData?.ref) && (
								<View
									className="p-4 rounded-lg mb-6"
									style={{ backgroundColor: backgroundSecondaryColor }}
								>
									<Text
										className="text-base font-semibold text-center"
										style={{ color: primaryColor }}
									>
										{devotional.reference || devotional.rawData?.ref}
									</Text>
								</View>
							)}

							{/* Verso */}
							{(devotional.verse || devotional.rawData?.text) && (
								<View className="mb-6">
									<Text
										className="text-xl leading-relaxed text-center italic"
										style={{ color: foregroundColor }}
									>
										"{devotional.verse || devotional.rawData?.text}"
									</Text>
								</View>
							)}

							{/* Resumo e Versículos Relacionados */}
							<VerseSummary
								summary={devotional.summary}
								relatedVerses={devotional.relatedVerses}
							/>

							{/* Título */}
							{devotional.title && (
								<View className="mb-4">
									<Text
										className="text-2xl font-bold"
										style={{ color: foregroundColor }}
									>
										{devotional.title}
									</Text>
								</View>
							)}

							{/* Conteúdo */}
							{devotional.content && (
								<View className="mb-6">
									<Text
										className="text-base leading-relaxed"
										style={{ color: foregroundColor }}
									>
										{devotional.content}
									</Text>
								</View>
							)}

							{/* Botões de ação */}
							<View className="flex-row gap-3 mt-6">
								<TouchableOpacity
									onPress={handleShare}
									className="flex-1 flex-row items-center justify-center p-4 rounded-lg border"
									style={{
										borderColor: primaryColor,
										backgroundColor: "transparent",
									}}
									activeOpacity={0.7}
								>
									<Ionicons
										name="share-outline"
										size={20}
										color={primaryColor}
										style={{ marginRight: 8 }}
									/>
									<Text style={{ color: primaryColor, fontWeight: "600" }}>
										{t('common.share')}
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={handleSave}
									disabled={isSaving}
									className="flex-1 flex-row items-center justify-center p-4 rounded-lg border"
									style={{
										borderColor: successColor,
										backgroundColor: isSaved ? successColor : "transparent",
										opacity: isSaving ? 0.5 : 1,
									}}
									activeOpacity={0.7}
								>
									<Ionicons
										name={isSaved ? "bookmark" : "bookmark-outline"}
										size={20}
										color={isSaved ? "#fff" : successColor}
										style={{ marginRight: 8 }}
									/>
									<Text
										style={{
											color: isSaved ? "#fff" : successColor,
											fontWeight: "600",
										}}
									>
										{isSaved ? t('common.saved') : t('common.save')}
									</Text>
								</TouchableOpacity>
							</View>
						</Card>
					)}
				</View>
			</ScrollView>
		</Container>
	);
}

