import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

// Endpoint HTTP para o widget Android buscar o devocional do dia
http.route({
	path: "/widget/devotional",
	method: "GET",
	handler: httpAction(async (ctx, request) => {
		try {
			const url = new URL(request.url);
			const language = url.searchParams.get("language") || "pt";
			
			// Busca o devocional do dia usando a query existente
			const devotional = await ctx.runQuery(api.dailyStudy.getTodayDevotional, {
				language: language === "pt" ? "pt" : "en",
			});

			if (!devotional) {
				return new Response(
					JSON.stringify({ error: "Nenhum devocional encontrado" }),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			return new Response(JSON.stringify(devotional), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : "Erro desconhecido",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	}),
});

export default http;
