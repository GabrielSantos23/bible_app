import { View, Text, TouchableOpacity } from "react-native";
import { Card, useThemeColor } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type RelatedVerse = {
	reference: string;
	text: string;
};

type VerseSummaryProps = {
	summary?: string | null;
	relatedVerses?: RelatedVerse[] | null;
};

export function VerseSummary({ summary, relatedVerses }: VerseSummaryProps) {
	const router = useRouter();

	const primaryColor = useThemeColor("primary" as any);
	const foregroundColor = useThemeColor("foreground");
	const mutedColor = useThemeColor("muted");
	const backgroundSecondaryColor = useThemeColor("backgroundSecondary" as any);

	const handleVerseClick = (verseRef: string) => {
		// Navega para a página de busca e passa o versículo como parâmetro
		router.push({
			pathname: "/two",
			params: { initialQuery: encodeURIComponent(verseRef) },
		});
	};

	// Se não houver resumo, não renderiza nada
	if (!summary) {
		return null;
	}

	return (
		<Card variant="secondary" className="p-4 mb-4">
			{/* Resumo */}
			<View className="mb-4">
				<View className="flex-row items-center mb-2">
					<Ionicons
						name="bulb-outline"
						size={20}
						color={primaryColor}
						style={{ marginRight: 8 }}
					/>
					<Text
						className="text-base font-semibold"
						style={{ color: foregroundColor }}
					>
						Resumo
					</Text>
				</View>
				<Text
					className="text-sm leading-relaxed"
					style={{ color: foregroundColor }}
				>
					{summary}
				</Text>
			</View>

			{/* Versículos relacionados */}
			{relatedVerses && relatedVerses.length > 0 && (
				<View>
					<View className="flex-row items-center mb-3">
						<Ionicons
							name="book-outline"
							size={20}
							color={primaryColor}
							style={{ marginRight: 8 }}
						/>
						<Text
							className="text-base font-semibold"
							style={{ color: foregroundColor }}
						>
							Versículos Relacionados
						</Text>
					</View>
					<View className="gap-2">
						{relatedVerses.map((relatedVerse, index) => (
							<TouchableOpacity
								key={index}
								onPress={() => handleVerseClick(relatedVerse.reference)}
								activeOpacity={0.7}
								className="p-3 rounded-lg border"
								style={{
									borderColor: primaryColor,
									backgroundColor: backgroundSecondaryColor,
								}}
							>
								<View className="flex-row items-start justify-between">
									<View className="flex-1 mr-2">
										<Text
											className="text-xs font-semibold mb-1"
											style={{ color: primaryColor }}
										>
											{relatedVerse.reference}
										</Text>
										<Text
											className="text-sm leading-relaxed"
											style={{ color: foregroundColor }}
										>
											{relatedVerse.text}
										</Text>
									</View>
									<Ionicons
										name="chevron-forward"
										size={20}
										color={mutedColor}
									/>
								</View>
							</TouchableOpacity>
						))}
					</View>
				</View>
			)}
		</Card>
	);
}

