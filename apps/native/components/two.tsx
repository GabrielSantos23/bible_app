import React from "react";
import {
	Text,
	View,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	FlatList,
	Keyboard,
} from "react-native";
import { Container } from "@/components/container";
import { Card, Chip, useThemeColor } from "heroui-native";
import { useAction } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useLocalSearchParams } from "expo-router";

type SearchResultItem = {
	id?: string;
	reference?: string;
	text?: string;
	[key: string]: any;
};

type SearchResponse = {
	query: string;
	language: "pt" | "en";
	results: SearchResultItem[];
	cursor: number;
	total?: number;
	fromCache: number;
	fromApi: number;
	hasMore: boolean;
};

export default function SearchScreen() {
	const { language } = useAppSettings();
	const params = useLocalSearchParams<{ initialQuery?: string }>();
	const [query, setQuery] = React.useState("");
	const [results, setResults] = React.useState<SearchResultItem[]>([]);
	const [cursor, setCursor] = React.useState(0);
	const [isLoading, setIsLoading] = React.useState(false);
	const [isLoadingMore, setIsLoadingMore] = React.useState(false);
	const [hasMore, setHasMore] = React.useState(false);
	const [lastQuery, setLastQuery] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	const foregroundColor = useThemeColor("foreground");
	const mutedColor = useThemeColor("muted");

	const searchBible = useAction(api.bibleSearch.searchBible);

	const handleSearchWithQuery = React.useCallback(async (searchQuery: string) => {
		const trimmed = searchQuery.trim();
		if (!trimmed) return;

		try {
			setIsLoading(true);
			setError(null);
			setResults([]);
			setCursor(0);
			setHasMore(false);
			setLastQuery(trimmed);
			Keyboard.dismiss();

			const response = (await searchBible({
				query: trimmed,
				language,
				cursor: 0,
				pageSize: 20,
			})) as SearchResponse;

			setResults(response.results);
			setCursor(response.cursor);
			setHasMore(response.hasMore);
		} catch (e: any) {
			console.error("Erro ao buscar versículos:", e);
			setError(
				e?.message ??
					"Ocorreu um erro ao buscar. Tente novamente mais tarde.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [searchBible, language]);

	// Se houver um parâmetro initialQuery, define como query inicial e busca automaticamente
	React.useEffect(() => {
		if (params.initialQuery && !query && !lastQuery) {
			const initialQuery = decodeURIComponent(params.initialQuery);
			setQuery(initialQuery);
			// Busca automaticamente após um pequeno delay para garantir que o estado foi atualizado
			setTimeout(() => {
				handleSearchWithQuery(initialQuery);
			}, 100);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.initialQuery]);

	const effectiveLanguageLabel =
		language === "pt" ? "Português" : "English";

	const canSearch = query.trim().length > 0 && !isLoading;

	const handleSearch = async () => {
		await handleSearchWithQuery(query);
	};

	const handleLoadMore = async () => {
		if (isLoadingMore || !hasMore || !lastQuery) return;

		try {
			setIsLoadingMore(true);
			setError(null);

			const response = (await searchBible({
				query: lastQuery,
				language,
				cursor,
				pageSize: 20,
			})) as SearchResponse;

			setResults((prev) => prev.concat(response.results));
			setCursor(response.cursor);
			setHasMore(response.hasMore);
		} catch (e: any) {
			console.error("Erro ao carregar mais resultados:", e);
			setError(
				e?.message ??
					"Ocorreu um erro ao carregar mais resultados.",
			);
		} finally {
			setIsLoadingMore(false);
		}
	};

	const renderItem = ({ item }: { item: SearchResultItem }) => {
		const reference = item.reference ?? item.human ?? item.osis ?? "";
		const text = item.text ?? item.content ?? "";

		return (
			<Card variant="flat" className="mb-3">
				<View className="p-3">
					{reference ? (
						<Text className="text-xs text-muted mb-1">
							{reference}
						</Text>
					) : null}
					<Text className="text-foreground text-sm">{text}</Text>
				</View>
			</Card>
		);
	};

	return (
		<Container className="flex-1">
			<View className="flex-1 p-6">
				<View className="mb-4">
					<Text className="text-2xl font-semibold text-foreground mb-1">
						Buscar na Bíblia
					</Text>
					<Text className="text-muted text-sm">
						Digite uma palavra, frase ou referência para pesquisar
						versículos. Idioma atual: {effectiveLanguageLabel}.
					</Text>
				</View>

				<Card variant="secondary" className="p-3 mb-4">
					<View className="flex-row items-center gap-2">
						<View className="flex-1 border rounded-md px-3 py-2 border-muted">
							<TextInput
								placeholder="Ex.: amor, João 3:16..."
								placeholderTextColor={mutedColor}
								value={query}
								onChangeText={setQuery}
								onSubmitEditing={handleSearch}
								returnKeyType="search"
								style={{
									color: foregroundColor,
								}}
							/>
						</View>
						<TouchableOpacity
							disabled={!canSearch}
							onPress={handleSearch}
							className={`px-4 py-2 rounded-md ${
								canSearch ? "bg-primary" : "bg-muted"
							}`}
						>
							{isLoading ? (
								<ActivityIndicator size="small" color="#ffffff" />
							) : (
								<Text className="text-primary-foreground font-medium">
									Buscar
								</Text>
							)}
						</TouchableOpacity>
					</View>
					<View className="flex-row items-center gap-2 mt-3">
						<Chip
							variant="flat"
							size="sm"
							className="bg-muted/40"
						>
							<Text className="text-xs text-muted">
								Resultados em {effectiveLanguageLabel}
							</Text>
						</Chip>
					</View>
				</Card>

				{error && (
					<Card variant="flat" className="mb-3 border border-danger/40">
						<View className="p-3">
							<Text className="text-danger text-sm">{error}</Text>
						</View>
					</Card>
				)}

				{!isLoading && results.length === 0 && !error && lastQuery === "" && (
					<View className="flex-1 items-center justify-center">
						<Text className="text-muted text-sm text-center px-6">
							Faça sua primeira busca para ver resultados de
							versículos aqui.
						</Text>
					</View>
				)}

				{!isLoading && results.length === 0 && lastQuery !== "" && !error && (
					<View className="flex-1 items-center justify-center">
						<Text className="text-muted text-sm text-center px-6">
							Não encontramos resultados para &quot;{lastQuery}
							&quot;. Tente usar outro termo ou uma referência
							diferente.
						</Text>
					</View>
				)}

				{results.length > 0 && (
					<View className="flex-1">
						<FlatList
							data={results}
							keyExtractor={(_, index) => String(index)}
							renderItem={renderItem}
							onEndReached={handleLoadMore}
							onEndReachedThreshold={0.5}
							ListFooterComponent={
								isLoadingMore ? (
									<View className="py-4 items-center">
										<ActivityIndicator size="small" />
									</View>
								) : null
							}
						/>
					</View>
				)}
			</View>
		</Container>
	);
}

