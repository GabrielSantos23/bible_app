import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

type SupportedLanguage = "pt" | "en";

// Importante: usar o host correto da REST API (rest.api.bible), não scripture.api.bible
const BASE_URL = "https://rest.api.bible/v1";

function getBibleIdForLanguage(language: SupportedLanguage) {
	const envKey =
		language === "pt"
			? process.env.BIBLE_API_BIBLE_ID_PT
			: process.env.BIBLE_API_BIBLE_ID_EN;

	if (!envKey) {
		throw new Error(
			`ID da Bíblia para o idioma "${language}" não configurado. Defina BIBLE_API_BIBLE_ID_${language.toUpperCase()} nas variáveis de ambiente do Convex.`,
		);
	}

	return envKey;
}

function normalizeTerm(term: string) {
	return term.trim().toLowerCase();
}

/**
 * NOTA: As funções abaixo foram criadas para suporte ao endpoint /passages,
 * mas atualmente não estão sendo usadas porque o endpoint /search da API.Bible
 * aceita referências bíblicas diretamente no parâmetro query (ex: "João 3:16", "Gênesis 1").
 * 
 * Mantidas aqui caso seja necessário fazer processamento especial de referências no futuro.
 */

/**
 * Detecta se a query é uma referência bíblica (ex: "João 3:16", "Gênesis 1", "Romanos 8:1-5")
 * Retorna informações sobre o tipo de busca e os componentes da referência
 * 
 * @deprecated Atualmente não usado - o endpoint /search aceita referências diretamente
 */
type ReferenceType = "verse" | "verseRange" | "chapter" | "text";
type ParsedReference = {
	type: ReferenceType;
	book?: string;
	chapter?: number;
	verseStart?: number;
	verseEnd?: number;
	originalQuery: string;
};

function parseBibleReference(query: string): ParsedReference {
	const trimmed = query.trim();
	
	// Padrão para versículo único: "João 3:16" ou "João 3:16-18"
	// Padrão para capítulo: "João 3" ou "Gênesis 1"
	const versePattern = /^([A-Za-zÀ-ÿ\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/;
	const chapterPattern = /^([A-Za-zÀ-ÿ\s]+?)\s+(\d+)$/;
	
	const verseMatch = trimmed.match(versePattern);
	if (verseMatch) {
		const [, book, chapter, verseStart, verseEnd] = verseMatch;
		return {
			type: verseEnd ? "verseRange" : "verse",
			book: book.trim(),
			chapter: parseInt(chapter, 10),
			verseStart: parseInt(verseStart, 10),
			verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
			originalQuery: trimmed,
		};
	}
	
	const chapterMatch = trimmed.match(chapterPattern);
	if (chapterMatch) {
		const [, book, chapter] = chapterMatch;
		// Verifica se não é apenas um número (ex: "123" não é uma referência)
		if (book.trim().length > 1) {
			return {
				type: "chapter",
				book: book.trim(),
				chapter: parseInt(chapter, 10),
				originalQuery: trimmed,
			};
		}
	}
	
	// Se não corresponde a nenhum padrão, é uma busca textual
	return {
		type: "text",
		originalQuery: trimmed,
	};
}

/**
 * Converte uma referência bíblica para o formato esperado pela API.Bible
 * 
 * @deprecated Atualmente não usado - o endpoint /search aceita referências diretamente
 */
function formatReferenceForApi(reference: ParsedReference): string {
	if (reference.type === "text") {
		return reference.originalQuery;
	}
	
	// Para referências, retorna no formato legível que a API aceita
	// A API.Bible aceita formatos como "Gen 1:1", "John 3:16", etc.
	return reference.originalQuery;
}

export const getSearchCache = internalQuery({
	args: {
		term: v.string(),
		language: v.union(v.literal("pt"), v.literal("en")),
	},
	handler: async (ctx, { term, language }) => {
		return await ctx.db
			.query("bibleSearchCache")
			.withIndex("by_term_language", (q: any) =>
				q.eq("term", term).eq("language", language),
			)
			.first();
	},
});

export const touchSearchCache = internalMutation({
	args: {
		id: v.id("bibleSearchCache"),
	},
	handler: async (ctx, { id }) => {
		await ctx.db.patch(id, {
			lastAccessedAt: Date.now(),
		});
	},
});

export const upsertSearchCache = internalMutation({
	args: {
		existingId: v.optional(v.id("bibleSearchCache")),
		term: v.string(),
		language: v.union(v.literal("pt"), v.literal("en")),
		results: v.array(v.any()),
		total: v.optional(v.number()),
		nextOffset: v.number(),
	},
	handler: async (ctx, { existingId, term, language, results, total, nextOffset }) => {
		const now = Date.now();

		if (existingId) {
			await ctx.db.patch(existingId, {
				results,
				total,
				nextOffset,
				updatedAt: now,
				lastAccessedAt: now,
			});
			return;
		}

		await ctx.db.insert("bibleSearchCache", {
			term,
			language,
			results,
			total,
			nextOffset,
			createdAt: now,
			updatedAt: now,
			lastAccessedAt: now,
		});
	},
});

type SearchBibleArgs = {
	query: string;
	language: SupportedLanguage;
	cursor?: number;
	pageSize?: number;
};

type SearchBibleResult = {
	query: string;
	language: SupportedLanguage;
	results: any[];
	cursor: number;
	total?: number;
	fromCache: number;
	fromApi: number;
	hasMore: boolean;
};

export const searchBible = action({
	args: {
		query: v.string(),
		language: v.union(v.literal("pt"), v.literal("en")),
		cursor: v.optional(v.number()), // quantos resultados já foram consumidos
		pageSize: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ query, language, cursor, pageSize }: SearchBibleArgs,
	): Promise<SearchBibleResult> => {
		const apiKey = process.env.BIBLE_API_KEY;
		if (!apiKey) {
			throw new Error(
				"Chave da API da Bíblia não configurada. Defina BIBLE_API_KEY nas variáveis de ambiente do Convex.",
			);
		}

		const normalizedTerm = normalizeTerm(query);
		const limit = pageSize ?? 20;
		const consumed = cursor ?? 0;

		// 1. Verifica cache
		const existing: any = await ctx.runQuery(internal.bibleSearch.getSearchCache, {
			term: normalizedTerm,
			language,
		});

		let cachedResults: any[] = existing?.results ?? [];
		const totalFromCache: number | undefined = existing?.total ?? undefined;
		let nextOffset = existing?.nextOffset ?? 0;

		// Atualiza lastAccessedAt se já existir cache
		if (existing) {
			await ctx.runMutation(internal.bibleSearch.touchSearchCache, {
				id: existing._id,
			});
		}

		// 2. Determina quantos resultados podemos devolver só do cache
		const availableFromCache = Math.max(cachedResults.length - consumed, 0);
		const takeFromCache = Math.min(availableFromCache, limit);

		let results: any[] = [];
		let fetchedFromApi = 0;

		if (takeFromCache > 0) {
			results = cachedResults.slice(consumed, consumed + takeFromCache);
		}

		const stillNeeded = limit - results.length;

		// 3. Se ainda precisamos de mais resultados, busca na API a partir de nextOffset
		if (stillNeeded > 0) {
			const bibleId = getBibleIdForLanguage(language);

			// Usa o endpoint /search para todos os tipos de busca
			// A API.Bible aceita tanto texto quanto referências bíblicas (ex: "João 3:16") no parâmetro query
			const searchUrl = new URL(
				`${BASE_URL}/bibles/${bibleId}/search`,
			);
			searchUrl.searchParams.set("query", query);
			searchUrl.searchParams.set("limit", String(stillNeeded));
			searchUrl.searchParams.set("offset", String(nextOffset));

			const response = await fetch(searchUrl.toString(), {
				method: "GET",
				headers: {
					"api-key": apiKey,
				},
			});

			if (!response.ok) {
				const errorBody = await response.text();
				console.error("Erro na API Bible:", response.status, errorBody);
				throw new Error(
					`Erro ao buscar na API Bible: ${response.status} ${response.statusText}`,
				);
			}

			const responseData = await response.json();

			// A API Bible geralmente retorna um objeto com um array de resultados (ex: data.verses)
			// Aqui tentamos pegar o array mais relevante, mas também guardamos o payload completo no cache.
			const apiResultsArray: any[] =
				responseData?.data?.verses ??
				responseData?.data?.passages ??
				responseData?.data?.searchResult ?? // fallback genérico
				[];

			fetchedFromApi = apiResultsArray.length;

			if (fetchedFromApi > 0) {
				results = results.concat(apiResultsArray);

				// Atualiza cache: concatena novos resultados
				const newCachedResults = cachedResults.concat(apiResultsArray);
				const newTotal = responseData?.data?.total ?? totalFromCache;
				nextOffset = nextOffset + fetchedFromApi;

				await ctx.runMutation(internal.bibleSearch.upsertSearchCache, {
					existingId: existing?._id,
					term: normalizedTerm,
					language,
					results: newCachedResults,
					total: newTotal,
					nextOffset,
				});

				cachedResults = newCachedResults;
			}
		}

		const newCursor = consumed + results.length;

		return {
			query,
			language,
			results,
			cursor: newCursor,
			total: totalFromCache ?? undefined,
			fromCache: results.length - fetchedFromApi,
			fromApi: fetchedFromApi,
			hasMore:
				typeof totalFromCache === "number"
					? newCursor < totalFromCache
					: fetchedFromApi > 0,
		};
	},
});


