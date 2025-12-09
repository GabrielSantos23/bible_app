import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	todos: defineTable({
		text: v.string(),
		completed: v.boolean(),
	}),
	dailyDevotionals: defineTable({
		date: v.string(), // Formato YYYY-MM-DD para identificar o dia
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		verse: v.optional(v.string()),
		reference: v.optional(v.string()),
		verseTranslated: v.optional(v.string()), // Verso traduzido para português
		referenceTranslated: v.optional(v.string()), // Referência traduzida para português
		summary: v.optional(v.string()), // Resumo gerado pela IA
		relatedVerses: v.optional(v.array(v.object({
			reference: v.string(),
			text: v.string(),
		}))), // Versículos relacionados gerados pela IA
		rawData: v.any(), // Armazena o JSON completo da API para flexibilidade
		createdAt: v.number(), // Timestamp de criação
		updatedAt: v.number(), // Timestamp de última atualização
	})
		.index("by_date", ["date"])
		.index("by_createdAt", ["createdAt"]),
	savedDevotionals: defineTable({
		userId: v.string(), // ID do usuário (do Better Auth)
		devotionalId: v.id("dailyDevotionals"), // Referência ao devocional
		savedAt: v.number(), // Timestamp de quando foi salvo
		type: v.optional(v.union(v.literal("devotional"), v.literal("verse"))), // Tipo: devotional ou verse
	})
		.index("by_userId", ["userId"])
		.index("by_userId_devotionalId", ["userId", "devotionalId"]),
	savedVerses: defineTable({
		userId: v.string(), // ID do usuário (do Better Auth)
		reference: v.string(), // Referência do versículo (ex: "Mateus 22:22")
		text: v.string(), // Texto do versículo
		language: v.union(v.literal("pt"), v.literal("en")), // Idioma do versículo
		savedAt: v.number(), // Timestamp de quando foi salvo
		rawData: v.optional(v.any()), // Dados brutos do resultado da busca
	})
		.index("by_userId", ["userId"])
		.index("by_userId_reference", ["userId", "reference"]),
	dailyLogins: defineTable({
		userId: v.string(), // ID do usuário (do Better Auth)
		date: v.string(), // Formato YYYY-MM-DD para identificar o dia
		loginTime: v.number(), // Timestamp de quando o usuário fez login
		createdAt: v.number(), // Timestamp de criação do registro
	})
		.index("by_userId", ["userId"])
		.index("by_userId_date", ["userId", "date"])
		.index("by_date", ["date"]),
	bibleSearchCache: defineTable({
		term: v.string(), // termo de busca normalizado (ex: lower-case)
		language: v.string(), // "pt" | "en"
		results: v.array(v.any()), // resultados agregados da API
		total: v.optional(v.number()), // total de resultados reportado pela API (se disponível)
		nextOffset: v.number(), // próximo offset para continuar a busca na API
		createdAt: v.number(),
		updatedAt: v.number(),
		lastAccessedAt: v.number(),
	})
		.index("by_term_language", ["term", "language"])
		.index("by_lastAccessedAt", ["lastAccessedAt"]),
});
