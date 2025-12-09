import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { google } from "@ai-sdk/google";
import { generateText, generateObject, Output } from "ai";
import { z } from "zod";

// Configuração do modelo - usando gemini-1.5-flash que é mais disponível no free tier
const GEMINI_MODEL = "gemini-2.5-flash-lite";
// Configuração de retry para rate limiting
const MAX_RETRIES = 2; // Reduzido de 3 para evitar múltiplas tentativas
const RETRY_DELAY_BASE = 2000; // 2 segundos base para backoff exponencial

/**
 * Helper para fazer retry com backoff exponencial e tratamento de erros 429
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = MAX_RETRIES,
	baseDelay: number = RETRY_DELAY_BASE
): Promise<T> {
	let lastError: any;
	
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: any) {
			lastError = error;
			
			// Se for erro 429 (quota excedida), tenta extrair o tempo de retry
			if (error?.statusCode === 429 || error?.data?.error?.code === 429) {
				const retryAfter = extractRetryAfter(error);
				const delay = retryAfter || baseDelay * Math.pow(2, attempt);
				
				if (attempt < maxRetries) {
					console.warn(`Quota excedida (tentativa ${attempt + 1}/${maxRetries + 1}). Aguardando ${delay}ms antes de tentar novamente.`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}
			}
			
			if (attempt >= maxRetries) {
				throw error;
			}
			
			// Para outros erros, usa backoff exponencial
			const delay = baseDelay * Math.pow(2, attempt);
			console.warn(`Erro na tentativa ${attempt + 1}/${maxRetries + 1}. Aguardando ${delay}ms antes de tentar novamente.`);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	throw lastError;
}


function extractRetryAfter(error: any): number | null {
	try {
		if (error?.responseBody) {
			const body = typeof error.responseBody === 'string' 
				? JSON.parse(error.responseBody) 
				: error.responseBody;
			
			if (body?.error?.details) {
				for (const detail of body.error.details) {
					if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
						const retryDelay = detail.retryDelay;
						if (retryDelay) {
							// Converte de segundos para milissegundos
							return parseFloat(retryDelay) * 1000;
						}
					}
				}
			}
		}
		
		if (error?.message) {
			const match = error.message.match(/Please retry in ([\d.]+)s/);
			if (match) {
				return parseFloat(match[1]) * 1000;
			}
		}
	} catch (e) {
	}
	
	return null;
}


const translationSchema = z.object({
	translation: z.string()
		.describe("Apenas o texto traduzido do verso, SEM a referência bíblica (ex: 'Gênesis 35:1'), SEM explicações, SEM formatação markdown. Apenas o texto puro do verso.")
		.min(1, "A tradução não pode estar vazia")
		.refine(
			(text) => {
				// Verifica se não começa com padrão de referência bíblica
				const referencePattern = /^['"]?[a-záàâãéêíóôõúç]+ [0-9]+:[0-9]+:?\s*['"]?/i;
				return !referencePattern.test(text.trim());
			},
			{
				message: "A tradução não deve incluir a referência bíblica no início do texto"
			}
		),
});


function cleanTranslation(text: string): string {
	let cleaned = text.trim();
	
	cleaned = cleaned.replace(/^['"]?[a-záàâãéêíóôõúç]+ [0-9]+:[0-9]+:?\s*['"]?\s*/i, '');
	
	cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
	
	cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
	
	cleaned = cleaned.split('\n')
		.filter(line => {
			const lower = line.toLowerCase().trim();
			return !lower.startsWith('aqui está') &&
				   !lower.startsWith('tradução') &&
				   !lower.startsWith('**') &&
				   !lower.match(/^[a-záàâãéêíóôõúç]+ [0-9]+:[0-9]+$/i) && // Remove referências sozinhas
				   line.trim().length > 0;
		})
		.join('\n')
		.trim();
	
	// Remove aspas externas se existirem (mas preserva aspas internas do texto)
	// Remove apenas se a string inteira estiver entre aspas
	if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
		(cleaned.startsWith("'") && cleaned.endsWith("'"))) {
		cleaned = cleaned.slice(1, -1).trim();
	}
	
	// Remove espaços múltiplos
	cleaned = cleaned.replace(/\s+/g, ' ').trim();
	
	return cleaned;
}

/**
 * Action interna para traduzir um verso bíblico para português usando Gemini
 */
export const translateVerse = internalAction({
	args: {
		verse: v.string(),
		reference: v.optional(v.string()),
	},
	handler: async (ctx, { verse, reference }) => {
		try {
			const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
			if (!apiKey) {
				console.warn(
					"GOOGLE_GENERATIVE_AI_API_KEY não configurada. Pulando tradução."
				);
				return { verseTranslated: null, referenceTranslated: null };
			}

			// Prompt otimizado e mais específico - força retorno apenas do texto SEM referência
			const prompt = reference
				? `Traduza APENAS o texto do verso abaixo para português brasileiro. IMPORTANTE: NÃO inclua a referência bíblica (${reference}) no texto traduzido. Retorne SOMENTE o texto do verso traduzido, sem a referência, sem explicações, sem formatação markdown. Apenas o texto puro do verso.\n\nVerso: "${verse}"`
				: `Traduza APENAS o texto abaixo para português brasileiro. Retorne SOMENTE o texto traduzido, sem explicações, sem formatação markdown. Apenas o texto puro.\n\n"${verse}"`;

			// Gera a tradução usando Gemini com retry e validação Zod
			const result = await withRetry(async () => {
				return await generateObject({
					model: google(GEMINI_MODEL),
					schema: translationSchema,
					schemaName: "Translation",
					schemaDescription: "Tradução do verso bíblico. Retorne apenas o campo 'translation' com o texto traduzido do verso, SEM incluir a referência bíblica (ex: 'Gênesis 35:1'), sem explicações ou formatação. Apenas o texto puro do verso.",
					prompt,
					temperature: 0.3,
					mode: "json",
					maxRetries: 0, // Desabilita retry interno, usamos nosso próprio
					providerOptions: {
						google: {
							maxOutputTokens: 500, // Limita tokens de saída
						},
					},
				});
			});

			// Extrai e limpa a tradução
			let verseTranslated = result.object.translation.trim();
			verseTranslated = cleanTranslation(verseTranslated);

			// Traduz a referência se fornecida (com prompt ainda mais curto)
			let referenceTranslated: string | null = null;
			if (reference) {
				const referenceResult = await withRetry(async () => {
					return await generateObject({
						model: google(GEMINI_MODEL),
						schema: z.object({
							translation: z.string().min(1),
						}),
						schemaName: "ReferenceTranslation",
						schemaDescription: "Tradução da referência bíblica. Apenas o texto traduzido.",
						prompt: `Traduza APENAS a referência para português. Retorne SOMENTE o texto traduzido, sem explicações: ${reference}`,
						temperature: 0.2,
						mode: "json",
						maxRetries: 0,
						providerOptions: {
							google: {
								maxOutputTokens: 100, // Referências são curtas
							},
						},
					});
				});
				referenceTranslated = cleanTranslation(referenceResult.object.translation.trim());
			}

			return {
				verseTranslated,
				referenceTranslated,
			};
		} catch (error) {
			console.error("Erro ao traduzir verso:", error);
			// Retorna null em caso de erro, mas não interrompe o fluxo
			return { verseTranslated: null, referenceTranslated: null };
		}
	},
});

/**
 * Query interna para obter o devocional completo de hoje (com todos os campos)
 */
export const getTodayDevotionalInternal = internalQuery({
	args: {},
	handler: async (ctx) => {
		const today = new Date().toISOString().split("T")[0];
		const devotional = await ctx.db
			.query("dailyDevotionals")
			.withIndex("by_date", (q) => q.eq("date", today))
			.first();
		
		return devotional;
	},
});

/**
 * Action interna para buscar dados da API externa
 * Esta action faz o fetch da API e chama a mutation para salvar os dados
 * IMPORTANTE: Usa double-check locking para evitar múltiplas chamadas simultâneas de IA
 */
export const fetchDailyDevotional = internalAction({
	args: {},
	handler: async (ctx): Promise<{ success: boolean; data?: any; error?: string; skipped?: boolean }> => {
		const today = new Date().toISOString().split("T")[0];
		
		try {
			// PRIMEIRA VERIFICAÇÃO: Verifica se já existe completo antes de fazer qualquer coisa
			const existingCheck: any = await ctx.runQuery(internal.dailyStudy.getTodayDevotionalInternal);
			
			if (existingCheck && existingCheck.verseTranslated && existingCheck.summary && 
				existingCheck.relatedVerses && existingCheck.relatedVerses.length > 0) {
				console.log("Devocional de hoje já está completo, pulando processamento");
				return { success: true, data: existingCheck.rawData, skipped: true };
			}

			// Busca dados da API
			const response = await fetch("https://discoverybiblestudy.org/daily/api/");
			
			if (!response.ok) {
				throw new Error(
					`Erro ao buscar dados da API: ${response.status} ${response.statusText}`
				);
			}

			const data = await response.json();
			
			// Extrai o verso e referência para tradução
			const verse = data.text || data.verse || data.Verse || data.scripture || "";
			const reference = data.ref || data.reference || data.Reference || data.scriptureReference || "";

			// SEGUNDA VERIFICAÇÃO: Verifica novamente após buscar da API (double-check locking)
			// Isso previne race conditions onde múltiplas actions chegam simultaneamente
			const existingCheck2 = await ctx.runQuery(internal.dailyStudy.getTodayDevotionalInternal);
			
			// Verifica se o verso mudou
			const verseChanged = !existingCheck2 || existingCheck2.verse !== verse || existingCheck2.reference !== reference;
			
			// Verifica se já tem tradução e resumo
			const hasTranslation = !!existingCheck2?.verseTranslated;
			const hasSummary = !!existingCheck2?.summary && !!existingCheck2?.relatedVerses && existingCheck2.relatedVerses.length > 0;
			
			// Se já está completo E o verso não mudou, não precisa processar
			if (existingCheck2 && hasTranslation && hasSummary && !verseChanged) {
				console.log("Devocional de hoje já está completo (verificação após fetch), pulando processamento");
				return { success: true, data, skipped: true };
			}

			// Só faz chamadas de IA se realmente necessário
			const needsTranslation = !existingCheck2 || !hasTranslation || verseChanged;
			const needsSummary = !existingCheck2 || !hasSummary || verseChanged;

			// Traduz o verso se necessário
			let translationResult: { verseTranslated: string | null; referenceTranslated: string | null } = { 
				verseTranslated: null, 
				referenceTranslated: null 
			};
			if (verse && needsTranslation) {
				// Verificação adicional antes de chamar IA (previne race conditions)
				const checkBeforeTranslation: any = await ctx.runQuery(internal.dailyStudy.getTodayDevotionalInternal);
				if (checkBeforeTranslation && checkBeforeTranslation.verseTranslated && 
					checkBeforeTranslation.verse === verse && checkBeforeTranslation.reference === reference) {
					console.log("Tradução já existe (verificação antes de chamar IA), usando existente");
					translationResult = {
						verseTranslated: checkBeforeTranslation.verseTranslated || null,
						referenceTranslated: checkBeforeTranslation.referenceTranslated || null,
					};
				} else {
					console.log("Fazendo tradução do verso (IA chamada)");
					translationResult = await ctx.runAction(internal.dailyStudy.translateVerse, {
						verse,
						reference: reference || undefined,
					});
				}
			} else if (existingCheck2 && hasTranslation && !verseChanged) {
				// Se já existe tradução e o verso não mudou, usa a existente
				console.log("Usando tradução existente (sem chamada de IA)");
				translationResult = {
					verseTranslated: existingCheck2.verseTranslated || null,
					referenceTranslated: existingCheck2.referenceTranslated || null,
				};
			}

			// Gera o resumo e versículos relacionados usando IA se necessário
			let summaryResult: { success: boolean; summary: string | null; relatedVerses: Array<{ reference: string; text: string }> } = {
				success: false,
				summary: null,
				relatedVerses: [],
			};
			if (verse && needsSummary) {
				// Verificação adicional antes de chamar IA (previne race conditions)
				const checkBeforeSummary: any = await ctx.runQuery(internal.dailyStudy.getTodayDevotionalInternal);
				if (checkBeforeSummary && checkBeforeSummary.summary && checkBeforeSummary.relatedVerses && 
					checkBeforeSummary.relatedVerses.length > 0 &&
					checkBeforeSummary.verse === verse && checkBeforeSummary.reference === reference) {
					console.log("Resumo já existe (verificação antes de chamar IA), usando existente");
					summaryResult = {
						success: true,
						summary: checkBeforeSummary.summary,
						relatedVerses: checkBeforeSummary.relatedVerses,
					};
				} else {
					console.log("Gerando resumo do verso (IA chamada)");
					// Usa o verso traduzido se disponível, senão usa o original
					const verseToUse = translationResult.verseTranslated || verse;
					const referenceToUse = translationResult.referenceTranslated || reference || undefined;
					summaryResult = await ctx.runAction(internal.dailyStudy.generateVerseSummaryInternal, {
						verse: verseToUse,
						reference: referenceToUse,
						language: "pt", // Sempre gera em português para o banco
					});
				}
			} else if (existingCheck2 && hasSummary && !verseChanged) {
				// Se já existe resumo e o verso não mudou, usa o existente
				console.log("Usando resumo existente (sem chamada de IA)");
				if (existingCheck2.summary && existingCheck2.relatedVerses) {
					summaryResult = {
						success: true,
						summary: existingCheck2.summary,
						relatedVerses: existingCheck2.relatedVerses,
					};
				}
			}
			
			// TERCEIRA VERIFICAÇÃO: Verifica novamente antes de salvar (última chance de evitar duplicação)
			const existingCheck3 = await ctx.runQuery(internal.dailyStudy.getTodayDevotionalInternal);
			if (existingCheck3 && existingCheck3.verseTranslated && existingCheck3.summary && 
				existingCheck3.relatedVerses && existingCheck3.relatedVerses.length > 0 &&
				existingCheck3.verse === verse && existingCheck3.reference === reference) {
				console.log("Devocional de hoje já está completo (verificação final), pulando salvamento");
				return { success: true, data, skipped: true };
			}
			
			// Chama a mutation interna para salvar os dados com a tradução e resumo
			await ctx.runMutation(internal.dailyStudy.upsertDailyDevotional, {
				data,
				translation: translationResult,
				summary: summaryResult.success && summaryResult.summary ? summaryResult.summary : undefined,
				relatedVerses: summaryResult.success && summaryResult.relatedVerses ? summaryResult.relatedVerses : undefined,
			});

			return { success: true, data };
		} catch (error) {
			console.error("Erro na action fetchDailyDevotional:", error);
			
			// Retorna erro para que o cron possa registrar
			return {
				success: false,
				error: error instanceof Error ? error.message : "Erro desconhecido",
			};
		}
	},
});

/**
 * Mutation interna para salvar ou atualizar o devocional diário
 * Implementa lógica de Upsert: se existe registro para hoje, atualiza; senão, cria novo
 */
export const upsertDailyDevotional = internalMutation({
	args: {
		data: v.any(), // Aceita qualquer estrutura JSON da API
		translation: v.optional(v.object({
			verseTranslated: v.union(v.string(), v.null()),
			referenceTranslated: v.union(v.string(), v.null()),
		})),
		summary: v.optional(v.string()), // Resumo gerado pela IA
		relatedVerses: v.optional(v.array(v.object({
			reference: v.string(),
			text: v.string(),
		}))), // Versículos relacionados gerados pela IA
	},
	handler: async (ctx, { data, translation, summary, relatedVerses }) => {
		// Tenta extrair a data do JSON da API, senão usa a data de hoje
		let dateString: string;
		if (data.date) {
			// Tenta converter a data do formato da API (ex: "2nd Dec 2025") para YYYY-MM-DD
			try {
				const date = new Date(data.date);
				if (!isNaN(date.getTime())) {
					dateString = date.toISOString().split("T")[0];
				} else {
					// Se falhar, usa a data de hoje
					dateString = new Date().toISOString().split("T")[0];
				}
			} catch {
				dateString = new Date().toISOString().split("T")[0];
			}
		} else {
			// Obtém a data de hoje no formato YYYY-MM-DD
			dateString = new Date().toISOString().split("T")[0];
		}
		const now = Date.now();

		// Busca se já existe um registro para esta data
		const existing = await ctx.db
			.query("dailyDevotionals")
			.withIndex("by_date", (q) => q.eq("date", dateString))
			.first();

		// Prepara os dados para salvar
		// Mapeia os campos do JSON da API (ref -> reference, text -> verse)
		const devotionalData = {
			date: dateString,
			title: data.title || data.Title || data.titleText || undefined,
			content: data.content || data.Content || data.body || undefined,
			verse: data.text || data.verse || data.Verse || data.scripture || undefined, // text é o verso
			reference: data.ref || data.reference || data.Reference || data.scriptureReference || undefined, // ref é a referência
			verseTranslated: translation?.verseTranslated || undefined,
			referenceTranslated: translation?.referenceTranslated || undefined,
			summary: summary ?? undefined, // Resumo gerado pela IA
			relatedVerses: relatedVerses ?? undefined, // Versículos relacionados gerados pela IA
			rawData: data, // Salva o JSON completo para flexibilidade
			updatedAt: now,
		};

		if (existing) {
			// Atualiza o registro existente
			await ctx.db.patch(existing._id, {
				...devotionalData,
				createdAt: existing.createdAt, // Mantém a data de criação original
			});
			return { action: "updated", id: existing._id };
		} else {
			// Cria um novo registro
			const newId = await ctx.db.insert("dailyDevotionals", {
				...devotionalData,
				createdAt: now,
			});
			return { action: "created", id: newId };
		}
	},
});

/**
 * Query pública para obter o devocional do dia atual
 * Retorna apenas dados do banco de dados, sem fazer fetch externo
 */
export const getTodayDevotional = query({
	args: {
		language: v.optional(v.union(v.literal("pt"), v.literal("en"))),
		_refreshKey: v.optional(v.number()), // Usado apenas para forçar refetch no cliente
	},
	handler: async (ctx, { language = "en" }) => {
		const today = new Date().toISOString().split("T")[0];
		
		// Busca o devocional de hoje
		let devotional = await ctx.db
			.query("dailyDevotionals")
			.withIndex("by_date", (q) => q.eq("date", today))
			.first();

		if (!devotional) {
			// Se não houver devocional de hoje, retorna o mais recente
			devotional = await ctx.db
				.query("dailyDevotionals")
				.withIndex("by_createdAt")
				.order("desc")
				.first();
		}

		if (!devotional) {
			return null;
		}

		// Se o idioma for português e houver tradução, retorna o verso traduzido
		if (language === "pt" && devotional.verseTranslated) {
			return {
				...devotional,
				verse: devotional.verseTranslated,
				reference: devotional.referenceTranslated || devotional.reference,
			};
		}

		return devotional;
	},
});

/**
 * Query pública para obter devocional de uma data específica
 */
export const getDevotionalByDate = query({
	args: {
		date: v.string(), // Formato YYYY-MM-DD
		language: v.optional(v.union(v.literal("pt"), v.literal("en"))),
	},
	handler: async (ctx, { date, language = "en" }) => {
		const devotional = await ctx.db
			.query("dailyDevotionals")
			.withIndex("by_date", (q) => q.eq("date", date))
			.first();

		if (!devotional) {
			return null;
		}

		// Se o idioma for português e houver tradução, retorna o verso traduzido
		if (language === "pt" && devotional.verseTranslated) {
			return {
				...devotional,
				verse: devotional.verseTranslated,
				reference: devotional.referenceTranslated || devotional.reference,
			};
		}

		return devotional;
	},
});

/**
 * Query pública para listar todos os devocionais (útil para histórico)
 */
export const getAllDevotionals = query({
	args: {
		limit: v.optional(v.number()),
		language: v.optional(v.union(v.literal("pt"), v.literal("en"))),
	},
	handler: async (ctx, { limit = 30, language = "en" }) => {
		const devotionals = await ctx.db
			.query("dailyDevotionals")
			.withIndex("by_createdAt")
			.order("desc")
			.take(limit);

		// Se o idioma for português, substitui os versos pelos traduzidos
		if (language === "pt") {
			return devotionals.map((devotional) => {
				if (devotional.verseTranslated) {
					return {
						...devotional,
						verse: devotional.verseTranslated,
						reference: devotional.referenceTranslated || devotional.reference,
					};
				}
				return devotional;
			});
		}

		return devotionals;
	},
});

/**
 * Action pública para fazer fetch manual (APENAS PARA TESTES)
 * Esta action permite que o frontend dispare manualmente a busca do devocional
 */
export const fetchDailyDevotionalManual = action({
	args: {},
	handler: async (ctx): Promise<{ success: boolean; data?: any; error?: string }> => {
		// Chama a action interna
		return await ctx.runAction(internal.dailyStudy.fetchDailyDevotional);
	},
});

/**
 * Query para verificar se um devocional está salvo pelo usuário atual
 */
export const isDevotionalSaved = query({
	args: {
		devotionalId: v.id("dailyDevotionals"),
	},
	handler: async (ctx, { devotionalId }) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return false;
		}

		const saved = await ctx.db
			.query("savedDevotionals")
			.withIndex("by_userId_devotionalId", (q) =>
				q.eq("userId", user._id.toString()).eq("devotionalId", devotionalId)
			)
			.first();

		return saved !== null;
	},
});

/**
 * Mutation para salvar um devocional
 */
export const saveDevotional = mutation({
	args: {
		devotionalId: v.id("dailyDevotionals"),
	},
	handler: async (ctx, { devotionalId }) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Usuário não autenticado");
		}

		// Verifica se já está salvo
		const existing = await ctx.db
			.query("savedDevotionals")
			.withIndex("by_userId_devotionalId", (q) =>
				q.eq("userId", user._id.toString()).eq("devotionalId", devotionalId)
			)
			.first();

		if (existing) {
			return { success: true, message: "Devocional já está salvo", id: existing._id };
		}

		// Salva o devocional
		const savedId = await ctx.db.insert("savedDevotionals", {
			userId: user._id.toString(),
			devotionalId,
			savedAt: Date.now(),
		});

		return { success: true, message: "Devocional salvo com sucesso", id: savedId };
	},
});

/**
 * Mutation para remover um devocional salvo
 */
export const unsaveDevotional = mutation({
	args: {
		devotionalId: v.id("dailyDevotionals"),
	},
	handler: async (ctx, { devotionalId }) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Usuário não autenticado");
		}

		// Busca o registro salvo
		const saved = await ctx.db
			.query("savedDevotionals")
			.withIndex("by_userId_devotionalId", (q) =>
				q.eq("userId", user._id.toString()).eq("devotionalId", devotionalId)
			)
			.first();

		if (!saved) {
			return { success: false, message: "Devocional não está salvo" };
		}

		// Remove o devocional salvo
		await ctx.db.delete(saved._id);

		return { success: true, message: "Devocional removido dos salvos" };
	},
});

/**
 * Query para verificar se um versículo pesquisado está salvo
 */
export const isVerseSaved = query({
	args: {
		reference: v.string(),
		text: v.string(),
	},
	handler: async (ctx, { reference, text }) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return false;
		}

		const saved = await ctx.db
			.query("savedVerses")
			.withIndex("by_userId_reference", (q) =>
				q.eq("userId", user._id.toString()).eq("reference", reference)
			)
			.filter((q) => q.eq(q.field("text"), text))
			.first();

		return saved !== null;
	},
});

/**
 * Mutation para salvar um versículo pesquisado
 */
export const saveVerse = mutation({
	args: {
		reference: v.string(),
		text: v.string(),
		language: v.union(v.literal("pt"), v.literal("en")),
		rawData: v.optional(v.any()),
	},
	handler: async (ctx, { reference, text, language, rawData }) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Usuário não autenticado");
		}

		// Verifica se já está salvo (mesma referência e texto)
		const existing = await ctx.db
			.query("savedVerses")
			.withIndex("by_userId_reference", (q) =>
				q.eq("userId", user._id.toString()).eq("reference", reference)
			)
			.filter((q) => q.eq(q.field("text"), text))
			.first();

		if (existing) {
			return { success: true, message: "Versículo já está salvo", id: existing._id };
		}

		// Salva o versículo
		const savedId = await ctx.db.insert("savedVerses", {
			userId: user._id.toString(),
			reference,
			text,
			language,
			savedAt: Date.now(),
			rawData: rawData ?? undefined,
		});

		return { success: true, message: "Versículo salvo com sucesso", id: savedId };
	},
});

/**
 * Mutation para remover um versículo salvo
 */
export const unsaveVerse = mutation({
	args: {
		reference: v.string(),
		text: v.string(),
	},
	handler: async (ctx, { reference, text }) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Usuário não autenticado");
		}

		// Busca o registro salvo
		const saved = await ctx.db
			.query("savedVerses")
			.withIndex("by_userId_reference", (q) =>
				q.eq("userId", user._id.toString()).eq("reference", reference)
			)
			.filter((q) => q.eq(q.field("text"), text))
			.first();

		if (!saved) {
			return { success: false, message: "Versículo não está salvo" };
		}

		// Remove o versículo salvo
		await ctx.db.delete(saved._id);

		return { success: true, message: "Versículo removido dos salvos" };
	},
});

/**
 * Query para listar todos os versículos salvos pelo usuário
 */
export const getSavedVerses = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return [];
		}

		const saved = await ctx.db
			.query("savedVerses")
			.withIndex("by_userId", (q) => q.eq("userId", user._id.toString()))
			.collect();

		// Ordena por savedAt em ordem decrescente (mais recentes primeiro)
		return saved.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
	},
});

/**
 * Query para listar todos os devocionais salvos pelo usuário
 */
export const getSavedDevotionals = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return [];
		}

		const saved = await ctx.db
			.query("savedDevotionals")
			.withIndex("by_userId", (q) => q.eq("userId", user._id.toString()))
			.order("desc")
			.collect();

		// Busca os devocionais completos
		const devotionals = await Promise.all(
			saved.map(async (savedItem) => {
				const devotional = await ctx.db.get(savedItem.devotionalId);
				if (!devotional) return null;
				
				// Por padrão retorna em inglês, mas pode ser estendido para aceitar parâmetro de idioma
				return { ...devotional, savedAt: savedItem.savedAt };
			})
		);

		return devotionals.filter((d) => d !== null);
	},
});

/**
 * Schema Zod para validar a resposta da IA
 * IMPORTANTE: O schema deve retornar um OBJETO, não um array
 */
const verseSummarySchema = z.object({
	summary: z.string()
		.describe("Resumo breve e inspirador (2-3 frases) explicando o significado e a importância do verso")
		.min(10, "O resumo deve ter pelo menos 10 caracteres"),
	relatedVerses: z.array(
		z.object({
			reference: z.string()
				.describe("Referência bíblica completa no formato 'Livro Capítulo:Versículo' (ex: João 3:16)")
				.min(3, "A referência deve ter pelo menos 3 caracteres"),
			text: z.string()
				.describe("Texto completo do versículo bíblico")
				.min(5, "O texto do versículo deve ter pelo menos 5 caracteres"),
		})
	)
		.min(3, "Deve haver pelo menos 3 versículos relacionados")
		.max(5, "Deve haver no máximo 5 versículos relacionados")
		.describe("Lista de 3-5 versículos bíblicos relacionados. Cada versículo deve ser um objeto com 'reference' e 'text' separados"),
});

/**
 * Action interna para gerar resumo e versículos relacionados usando IA
 */
export const generateVerseSummaryInternal = internalAction({
	args: {
		verse: v.string(),
		reference: v.optional(v.string()),
		language: v.optional(v.union(v.literal("pt"), v.literal("en"))),
	},
	handler: async (ctx, { verse, reference, language = "pt" }) => {
		try {
			const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
			if (!apiKey) {
				console.warn("GOOGLE_GENERATIVE_AI_API_KEY não configurada. Pulando geração de resumo.");
				return { 
					success: false, 
					summary: null, 
					relatedVerses: [] 
				};
			}

			const verseText = reference 
				? `${reference}: "${verse}"`
				: `"${verse}"`;

			// Prompt para gerar resumo e versículos relacionados
			const prompt = language === "pt"
				? `Você é um assistente bíblico especializado. Com base no seguinte verso bíblico, gere um objeto JSON com exatamente esta estrutura:

{
  "summary": "Resumo breve e inspirador (2-3 frases) explicando o significado e a importância do verso",
  "relatedVerses": [
    {
      "reference": "João 3:16",
      "text": "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna."
    },
    {
      "reference": "Romanos 5:8",
      "text": "Mas Deus prova o seu amor para conosco em que Cristo morreu por nós, sendo nós ainda pecadores."
    },
    {
      "reference": "1 João 4:9",
      "text": "Nisto se manifestou o amor de Deus para conosco: que Deus enviou seu Filho unigênito ao mundo, para que por ele vivamos."
    }
  ]
}

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS um objeto JSON válido, NUNCA um array
2. O campo deve ser "relatedVerses" (camelCase), não "related_verses" ou qualquer outra variação
3. "relatedVerses" deve ser um ARRAY DE OBJETOS, não um array de strings
4. Cada objeto dentro de "relatedVerses" DEVE ter exatamente dois campos: "reference" (string) e "text" (string)
5. Gere entre 3 e 5 versículos relacionados (objetos completos com referências e textos reais)
6. NÃO retorne strings como "reference" ou "text" - retorne objetos completos com valores reais de versículos bíblicos
7. Não inclua o campo "verse" no objeto retornado

Verso bíblico: ${verseText}`
				: `You are a biblical assistant. Based on the following Bible verse, generate a JSON object with exactly this structure:

{
  "summary": "Brief and inspiring summary (2-3 sentences) explaining the meaning and importance of this verse",
  "relatedVerses": [
    {
      "reference": "John 3:16",
      "text": "For God so loved the world that he gave his one and only Son..."
    },
    {
      "reference": "Romans 5:8",
      "text": "But God demonstrates his own love for us..."
    }
  ]
}

IMPORTANT:
- Return ONLY a JSON object, not an array
- The field must be "relatedVerses" (camelCase), not "related_verses"
- Each related verse must be an object with "reference" and "text" separated
- Generate between 3 and 5 related verses
- Do not include a "verse" field in the returned object

Bible verse: ${verseText}`;

			// Gera o resumo e versículos relacionados usando Gemini
			// Desabilitamos structured outputs do Google pois pode ter problemas com arrays aninhados
			const result = await generateObject({
				model: google(GEMINI_MODEL),
				schema: verseSummarySchema,
				schemaName: "VerseSummary",
				schemaDescription: "Resumo e versículos relacionados de um verso bíblico. relatedVerses é um array de objetos, cada um com 'reference' (string) e 'text' (string).",
				prompt,
				temperature: 0.5, // Temperatura mais baixa para mais consistência
				mode: "json",
				providerOptions: {
					google: {
						structuredOutputs: false, // Desabilita structured outputs nativo, usa apenas validação Zod
					},
				},
			});

			// O resultado já está validado pelo Zod e tipado corretamente
			const validatedData = result.object as z.infer<typeof verseSummarySchema>;
			
			return {
				success: true,
				summary: validatedData.summary,
				relatedVerses: validatedData.relatedVerses,
			};
		} catch (error: any) {
			console.error("Erro ao gerar resumo do verso:", error);
			
			// Tenta extrair dados do erro se disponível
			if (error?.text || error?.value) {
				try {
					const textToParse = error.text || JSON.stringify(error.value);
					const parsed = JSON.parse(textToParse);
					// Se for um array, pega o primeiro elemento
					const data = Array.isArray(parsed) ? parsed[0] : parsed;
					
					// Tenta mapear para o formato esperado
					if (data.summary || data.relatedVerses || data.related_verses) {
						let relatedVerses: Array<{ reference: string; text: string }> = [];
						
						// Tenta pegar relatedVerses ou related_verses
						const versesData = data.relatedVerses || data.related_verses || [];
						
						if (Array.isArray(versesData)) {
							// Detecta se é um array de strings simples como ["reference", "text", ...]
							const isSimpleStringArray = versesData.every((v: any) => 
								typeof v === 'string' && (v === 'reference' || v === 'text' || v.length < 10)
							);
							
							// Detecta se são strings que parecem JSON mal formatado (ex: 'reference": "valor", "text": "valor"')
							const isMalformedJsonArray = !isSimpleStringArray && versesData.every((v: any) => 
								typeof v === 'string' && 
								v.length > 10 && 
								(v.includes('"reference"') || v.includes('reference":')) &&
								(v.includes('"text"') || v.includes('text":'))
							);
							
							// Se detectou JSON mal formatado, tenta extrair os dados primeiro
							if (isMalformedJsonArray && data.summary) {
								console.warn("IA retornou JSON mal formatado, tentando extrair versículos");
								try {
									const extractedVerses = versesData
										.map((v: string) => {
											// Tenta extrair usando regex: "reference": "valor", "text": "valor"
											const refMatch = v.match(/"reference"\s*:\s*"([^"]+)"/);
											const textMatch = v.match(/"text"\s*:\s*"([^"]+)"/);
											if (refMatch && textMatch) {
												return { 
													reference: refMatch[1].trim(), 
													text: textMatch[1].trim() 
												};
											}
											return null;
										})
										.filter((v: any): v is { reference: string; text: string } => 
											v !== null && v.reference && v.text && v.reference.length > 2 && v.text.length > 5
										);
									
									if (extractedVerses.length >= 3) {
										return {
											success: true,
											summary: data.summary,
											relatedVerses: extractedVerses.slice(0, 5),
										};
									}
								} catch (extractError) {
									console.error("Erro ao extrair versículos do JSON mal formatado:", extractError);
								}
							}
							
							// Se for array de strings simples, tenta segunda chamada
							if (isSimpleStringArray && data.summary) {
								// Se for array de strings simples mas temos o resumo, tenta gerar os versículos em uma segunda chamada
								console.warn("IA retornou array de strings simples, tentando gerar versículos em segunda chamada");
								
								try {
									// Reconstrói o verseText para usar na segunda chamada
									const verseTextForRetry = reference 
										? `${reference}: "${verse}"`
										: `"${verse}"`;
									
									const versesPrompt = language === "pt"
										? `Com base no seguinte verso bíblico, gere APENAS uma lista de 3-5 versículos bíblicos relacionados. Retorne um array JSON de objetos, onde cada objeto tem "reference" e "text".

Exemplo de formato:
[
  { "reference": "João 3:16", "text": "Porque Deus amou o mundo..." },
  { "reference": "Romanos 5:8", "text": "Mas Deus prova o seu amor..." }
]

Verso: ${verseTextForRetry}

Retorne APENAS o array JSON, sem explicações.`
										: `Based on the following Bible verse, generate ONLY a list of 3-5 related Bible verses. Return a JSON array of objects, where each object has "reference" and "text".

Example format:
[
  { "reference": "John 3:16", "text": "For God so loved the world..." },
  { "reference": "Romans 5:8", "text": "But God demonstrates his love..." }
]

Verse: ${verseTextForRetry}

Return ONLY the JSON array, no explanations.`;

									const versesSchema = z.array(
										z.object({
											reference: z.string(),
											text: z.string(),
										})
									).min(3).max(5);

									const versesResult = await withRetry(async () => {
										return await generateObject({
											model: google(GEMINI_MODEL),
											schema: versesSchema,
											prompt: versesPrompt,
											temperature: 0.5,
											mode: "json",
											maxRetries: 0,
											providerOptions: {
												google: {
													structuredOutputs: false,
													maxOutputTokens: 1500,
												},
											},
										});
									});

									const generatedVerses = versesResult.object as Array<{ reference: string; text: string }>;
									
									return {
										success: true,
										summary: data.summary,
										relatedVerses: generatedVerses,
									};
								} catch (versesError) {
									console.error("Erro ao gerar versículos em segunda chamada:", versesError);
									// Se falhar, retorna apenas o resumo
									return {
										success: true,
										summary: data.summary,
										relatedVerses: [],
									};
								}
							}
							
							relatedVerses = versesData
								.map((v: any, index: number) => {
									// Se for string simples como "reference" ou "text", ignora
									if (typeof v === 'string' && (v === 'reference' || v === 'text')) {
										return null;
									}
									
									// Se for string com conteúdo real, tenta extrair referência e texto
									if (typeof v === 'string' && v.length > 5) {
										// Tenta detectar se é um JSON mal formatado (ex: 'reference": "Salmos 34:7", "text": "..."')
										// Tenta fazer parse como objeto JSON parcial
										try {
											// Tenta adicionar chaves faltantes para formar um objeto válido
											const fixedJson = `{${v}}`;
											const parsed = JSON.parse(fixedJson);
											if (parsed.reference && parsed.text) {
												return { reference: String(parsed.reference), text: String(parsed.text) };
											}
										} catch {
											// Se não conseguir fazer parse, continua com regex
										}
										
										// Tenta extrair usando regex - padrão: "reference": "valor", "text": "valor"
										const refMatch = v.match(/"reference"\s*:\s*"([^"]+)"/);
										const textMatch = v.match(/"text"\s*:\s*"([^"]+)"/);
										if (refMatch && textMatch) {
											return { 
												reference: refMatch[1].trim(), 
												text: textMatch[1].trim() 
											};
										}
										
										// Tenta padrão: "Referência: "texto""
										const match = v.match(/^(.+?):\s*["'](.+?)["']\.?$/);
										if (match) {
											return { reference: match[1].trim(), text: match[2].trim() };
										}
										
										// Tenta padrão: "Referência texto completo"
										const refMatch2 = v.match(/^([A-Za-zÀ-ÿ\s]+\s\d+:\d+):\s*(.+)$/);
										if (refMatch2) {
											return { reference: refMatch2[1].trim(), text: refMatch2[2].trim() };
										}
										
										// Se não conseguir, tenta encontrar referência no início
										const refMatch3 = v.match(/^([A-Za-zÀ-ÿ\s]+\s\d+:\d+)/);
										return {
											reference: refMatch3 ? refMatch3[1] : `Versículo ${index + 1}`,
											text: v.replace(/^[^:]+:\s*/, "").replace(/^["']|["']\.?$/g, "").trim() || v
										};
									}
									
									// Se já for objeto, valida e retorna
									if (typeof v === 'object' && v !== null) {
										if (v.reference && v.text) {
											return { reference: String(v.reference), text: String(v.text) };
										}
										// Tenta outros formatos de objeto
										if (v.verse || v.versiculo) {
											return {
												reference: String(v.reference || v.ref || v.versiculo || `Versículo ${index + 1}`),
												text: String(v.text || v.verse || v.versiculo || '')
											};
										}
									}
									
									return null;
								})
								.filter((v: any): v is { reference: string; text: string } => 
									v !== null && v.reference && v.text && v.reference.length > 2 && v.text.length > 5
								)
								.slice(0, 5);
						}
						
						// Se conseguiu extrair pelo menos o resumo, retorna
						if (data.summary || relatedVerses.length > 0) {
							return {
								success: true,
								summary: data.summary || null,
								relatedVerses: relatedVerses,
							};
						}
					}
				} catch (parseError) {
					console.error("Erro ao fazer parse do erro:", parseError);
					console.error("Texto do erro:", error?.text || error?.value);
				}
			}
			
			return {
				success: false,
				summary: null,
				relatedVerses: [],
			};
		}
	},
});

/**
 * Action para gerar resumo e versículos relacionados ao verso do dia usando IA
 */
export const generateVerseSummary = action({
	args: {
		verse: v.string(),
		reference: v.optional(v.string()),
		language: v.optional(v.union(v.literal("pt"), v.literal("en"))),
	},
	handler: async (ctx, { verse, reference, language = "pt" }) => {
		try {
			const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
			if (!apiKey) {
				throw new Error("GOOGLE_GENERATIVE_AI_API_KEY não configurada");
			}

			const verseText = reference 
				? `${reference}: "${verse}"`
				: `"${verse}"`;

			// Prompt otimizado - muito mais curto para reduzir tokens
			const prompt = language === "pt"
				? `Gere JSON: {"summary": "resumo 2-3 frases", "relatedVerses": [{"reference": "Livro X:Y", "text": "texto"}]}. 3-5 versículos relacionados. Verso: ${verseText}`
				: `Generate JSON: {"summary": "2-3 sentence summary", "relatedVerses": [{"reference": "Book X:Y", "text": "text"}]}. 3-5 related verses. Verse: ${verseText}`;

			// Gera o resumo e versículos relacionados usando Gemini com retry
			const result = await withRetry(async () => {
				return await generateObject({
					model: google(GEMINI_MODEL),
					schema: verseSummarySchema,
					schemaName: "VerseSummary",
					schemaDescription: "Resumo e versículos relacionados. relatedVerses é array de objetos com 'reference' e 'text'.",
					prompt,
					temperature: 0.5,
					mode: "json",
					maxRetries: 0, // Usamos nosso próprio retry
					providerOptions: {
						google: {
							structuredOutputs: false,
							maxOutputTokens: 2000, // Limita tokens de saída
						},
					},
				});
			});

			// O resultado já está validado pelo Zod e tipado corretamente
			const validatedData = result.object as z.infer<typeof verseSummarySchema>;
			
			return {
				success: true,
				summary: validatedData.summary,
				relatedVerses: validatedData.relatedVerses,
			};
		} catch (error: any) {
			console.error("Erro ao gerar resumo do verso:", error);
			
			// Tenta extrair dados do erro se disponível (mesmo tratamento da função interna)
			if (error?.text || error?.value) {
				try {
					const textToParse = error.text || JSON.stringify(error.value);
					const parsed = JSON.parse(textToParse);
					const data = Array.isArray(parsed) ? parsed[0] : parsed;
					
					if (data.summary || data.relatedVerses || data.related_verses) {
						let relatedVerses: Array<{ reference: string; text: string }> = [];
						const versesData = data.relatedVerses || data.related_verses || [];
						
						if (Array.isArray(versesData)) {
							const isSimpleStringArray = versesData.every((v: any) => 
								typeof v === 'string' && (v === 'reference' || v === 'text' || v.length < 10)
							);
							
							// Detecta se são strings que parecem JSON mal formatado (ex: 'reference": "valor", "text": "valor"')
							const isMalformedJsonArray = !isSimpleStringArray && versesData.every((v: any) => 
								typeof v === 'string' && 
								v.length > 10 && 
								(v.includes('"reference"') || v.includes('reference":')) &&
								(v.includes('"text"') || v.includes('text":'))
							);
							
							// Se detectou JSON mal formatado, tenta extrair os dados primeiro
							if (isMalformedJsonArray && data.summary) {
								console.warn("IA retornou JSON mal formatado, tentando extrair versículos");
								try {
									const extractedVerses = versesData
										.map((v: string) => {
											// Tenta extrair usando regex: "reference": "valor", "text": "valor"
											const refMatch = v.match(/"reference"\s*:\s*"([^"]+)"/);
											const textMatch = v.match(/"text"\s*:\s*"([^"]+)"/);
											if (refMatch && textMatch) {
												return { 
													reference: refMatch[1].trim(), 
													text: textMatch[1].trim() 
												};
											}
											return null;
										})
										.filter((v: any): v is { reference: string; text: string } => 
											v !== null && v.reference && v.text && v.reference.length > 2 && v.text.length > 5
										);
									
									if (extractedVerses.length >= 3) {
										return {
											success: true,
											summary: data.summary,
											relatedVerses: extractedVerses.slice(0, 5),
										};
									}
								} catch (extractError) {
									console.error("Erro ao extrair versículos do JSON mal formatado:", extractError);
								}
							}
							
							if (isSimpleStringArray) {
								return {
									success: true,
									summary: data.summary || null,
									relatedVerses: [],
								};
							}
							
							relatedVerses = versesData
								.map((v: any, index: number) => {
									if (typeof v === 'string' && (v === 'reference' || v === 'text')) return null;
									if (typeof v === 'string' && v.length > 5) {
										// Tenta extrair usando regex: "reference": "valor", "text": "valor"
										const jsonRefMatch = v.match(/"reference"\s*:\s*"([^"]+)"/);
										const jsonTextMatch = v.match(/"text"\s*:\s*"([^"]+)"/);
										if (jsonRefMatch && jsonTextMatch) {
											return { 
												reference: jsonRefMatch[1].trim(), 
												text: jsonTextMatch[1].trim() 
											};
										}
										
										const match = v.match(/^(.+?):\s*["'](.+?)["']\.?$/);
										if (match) return { reference: match[1].trim(), text: match[2].trim() };
										const refMatchPattern = v.match(/^([A-Za-zÀ-ÿ\s]+\s\d+:\d+):\s*(.+)$/);
										if (refMatchPattern) return { reference: refMatchPattern[1].trim(), text: refMatchPattern[2].trim() };
										const refMatch3 = v.match(/^([A-Za-zÀ-ÿ\s]+\s\d+:\d+)/);
										return {
											reference: refMatch3 ? refMatch3[1] : `Versículo ${index + 1}`,
											text: v.replace(/^[^:]+:\s*/, "").replace(/^["']|["']\.?$/g, "").trim() || v
										};
									}
									if (typeof v === 'object' && v !== null && v.reference && v.text) {
										return { reference: String(v.reference), text: String(v.text) };
									}
									return null;
								})
								.filter((v: any): v is { reference: string; text: string } => 
									v !== null && v.reference && v.text && v.reference.length > 2 && v.text.length > 5
								)
								.slice(0, 5);
						}
						
						if (data.summary || relatedVerses.length > 0) {
							return {
								success: true,
								summary: data.summary || null,
								relatedVerses: relatedVerses,
							};
						}
					}
				} catch (parseError) {
					console.error("Erro ao fazer parse do erro:", parseError);
					console.error("Texto do erro:", error?.text || error?.value);
				}
			}
			
			return {
				success: false,
				error: error instanceof Error ? error.message : "Erro desconhecido",
				summary: null,
				relatedVerses: [],
			};
		}
	},
});

