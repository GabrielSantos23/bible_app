import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatLocalDate(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function normalizeDateString(dateString: string) {
	// Garantir que estamos usando a meia-noite local para comparações
	return new Date(`${dateString}T00:00:00`);
}

/**
 * Registra uma entrada diária do usuário no app
 * Se o usuário já fez login hoje, atualiza o timestamp
 */
export const recordDailyLogin = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Usuário não autenticado");
		}

		const userId = user._id.toString();
		const now = Date.now();
		// Formata a data como YYYY-MM-DD usando o timezone local
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, "0");
		const day = String(today.getDate()).padStart(2, "0");
		const dateString = `${year}-${month}-${day}`;

		// Verifica se já existe um login para hoje
		const existingLogin = await ctx.db
			.query("dailyLogins")
			.withIndex("by_userId_date", (q) =>
				q.eq("userId", userId).eq("date", dateString)
			)
			.first();

		if (existingLogin) {
			// Atualiza o timestamp do login
			await ctx.db.patch(existingLogin._id, {
				loginTime: now,
			});
			return { success: true, action: "updated", id: existingLogin._id };
		} else {
			// Cria um novo registro
			const newId = await ctx.db.insert("dailyLogins", {
				userId,
				date: dateString,
				loginTime: now,
				createdAt: now,
			});
			return { success: true, action: "created", id: newId };
		}
	},
});

/**
 * Busca todos os logins diários do usuário (útil para estatísticas)
 */
export const getAllUserLogins = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return [];
		}

		const userId = user._id.toString()  ;

		const logins = await ctx.db
			.query("dailyLogins")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();

		return logins;
	},
});

/**
 * Verifica se o usuário fez login hoje
 */
export const hasLoggedInToday = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return false;
		}

		const userId = user._id.toString();
		// Formata a data como YYYY-MM-DD usando o timezone local
		const todayDate = new Date();
		const year = todayDate.getFullYear();
		const month = String(todayDate.getMonth() + 1).padStart(2, "0");
		const day = String(todayDate.getDate()).padStart(2, "0");
		const today = `${year}-${month}-${day}`;

		const login = await ctx.db
			.query("dailyLogins")
			.withIndex("by_userId_date", (q) =>
				q.eq("userId", userId).eq("date", today)
			)
			.first();

		return !!login;
	},
});

/**
 * Retorna os logins da semana atual (domingo a sábado) para montar o plano semanal
 */
export const getWeeklyLogins = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return [];
		}

		const userId = user._id.toString();
		const today = new Date();
		const todayString = formatLocalDate(today);
		
		// Calcula o início da semana atual (domingo)
		const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, etc.
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - dayOfWeek);
		startOfWeek.setHours(0, 0, 0, 0);
		
		const startString = formatLocalDate(startOfWeek);
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);
		const endString = formatLocalDate(endOfWeek);

		const logins = await ctx.db
			.query("dailyLogins")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();

		const loginDates = new Set(
			logins
				.filter((login) => {
					const loginDate = normalizeDateString(login.date);
					const startDate = normalizeDateString(startString);
					const endDate = normalizeDateString(endString);
					return loginDate >= startDate && loginDate <= endDate;
				})
				.map((login) => login.date)
		);

		const week: {
			date: string;
			label: string;
			hasLogin: boolean;
			isToday: boolean;
		}[] = [];

		for (let i = 0; i < 7; i++) {
			const current = new Date(startOfWeek.getTime() + i * ONE_DAY_MS);
			const dateString = formatLocalDate(current);
			const label = current
				.toLocaleDateString("en-US", { weekday: "short" })
				.slice(0, 2)
				.toUpperCase();

			week.push({
				date: dateString,
				label,
				hasLogin: loginDates.has(dateString),
				isToday: dateString === todayString,
			});
		}

		return week;
	},
});

/**
 * Estatísticas gerais de logins (streaks, totais)
 */
export const getLoginStats = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return {
				totalLogins: 0,
				currentStreak: 0,
				longestStreak: 0,
				lastLoginDate: null as string | null,
			};
		}

		const userId = user._id.toString();
		const logins = await ctx.db
			.query("dailyLogins")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();

		const uniqueDates = Array.from(new Set(logins.map((l) => l.date))).sort(
			(a, b) => (a > b ? -1 : 1)
		);

		const todayString = formatLocalDate(new Date());
		const yesterdayString = formatLocalDate(new Date(Date.now() - ONE_DAY_MS));

		let currentStreak = 0;
		let previousDateMs: number | null = null;

		for (const date of uniqueDates) {
			const currentMs = normalizeDateString(date).getTime();

			if (currentStreak === 0) {
				// Só iniciamos streak se a última atividade foi hoje ou ontem
				if (date === todayString || date === yesterdayString) {
					currentStreak = 1;
					previousDateMs = currentMs;
				} else {
					break;
				}
			} else if (previousDateMs !== null && previousDateMs - currentMs === ONE_DAY_MS) {
				currentStreak += 1;
				previousDateMs = currentMs;
			} else {
				break;
			}
		}

		// Longest streak: percorre datas em ordem crescente
		const datesAsc = [...uniqueDates].sort((a, b) => (a > b ? 1 : -1));
		let longestStreak = 0;
		let streak = 0;
		let prevMs: number | null = null;

		for (const date of datesAsc) {
			const ms = normalizeDateString(date).getTime();
			if (prevMs === null || ms - prevMs === ONE_DAY_MS) {
				streak += 1;
			} else {
				longestStreak = Math.max(longestStreak, streak);
				streak = 1;
			}
			prevMs = ms;
		}
		longestStreak = Math.max(longestStreak, streak);

		// Calculate average logins per day
		// Get the first login date and today
		let averageLoginsPerDay = 0;
		if (uniqueDates.length > 0) {
			const firstLoginDate = normalizeDateString(uniqueDates[uniqueDates.length - 1]);
			const todayDate = new Date();
			const daysSinceFirstLogin = Math.max(
				1,
				Math.ceil((todayDate.getTime() - firstLoginDate.getTime()) / ONE_DAY_MS)
			);
			averageLoginsPerDay = uniqueDates.length / daysSinceFirstLogin;
		}

		return {
			totalLogins: uniqueDates.length,
			currentStreak,
			longestStreak,
			lastLoginDate: uniqueDates[0] ?? null,
			averageLoginsPerDay,
		};
	},
});

/**
 * Compara a semana atual com a semana anterior
 * Retorna dados detalhados de cada semana, contagens e intervalos formatados
 */
export const getWeeklyComparison = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return {
				currentWeek: [],
				previousWeek: [],
				currentWeekCount: 0,
				previousWeekCount: 0,
				currentWeekStart: null as string | null,
				currentWeekEnd: null as string | null,
				previousWeekStart: null as string | null,
				previousWeekEnd: null as string | null,
				currentWeekFormatted: null as string | null,
				previousWeekFormatted: null as string | null,
			};
		}

		const userId = user._id.toString();
		const today = new Date();
		const todayString = formatLocalDate(today);

		// Calcula o início da semana atual (domingo)
		const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, etc.
		const startOfCurrentWeek = new Date(today);
		startOfCurrentWeek.setDate(today.getDate() - dayOfWeek);
		startOfCurrentWeek.setHours(0, 0, 0, 0);

		// Calcula o fim da semana atual (sábado)
		const endOfCurrentWeek = new Date(startOfCurrentWeek);
		endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
		endOfCurrentWeek.setHours(23, 59, 59, 999);

		// Calcula o início da semana anterior
		const startOfPreviousWeek = new Date(startOfCurrentWeek);
		startOfPreviousWeek.setDate(startOfCurrentWeek.getDate() - 7);

		// Calcula o fim da semana anterior
		const endOfPreviousWeek = new Date(startOfPreviousWeek);
		endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 6);
		endOfPreviousWeek.setHours(23, 59, 59, 999);

		const startCurrentString = formatLocalDate(startOfCurrentWeek);
		const endCurrentString = formatLocalDate(endOfCurrentWeek);
		const startPreviousString = formatLocalDate(startOfPreviousWeek);
		const endPreviousString = formatLocalDate(endOfPreviousWeek);

		// Busca todos os logins do usuário
		const logins = await ctx.db
			.query("dailyLogins")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();

		const loginDates = new Set(logins.map((login) => login.date));

		// Helper para formatar intervalo de datas
		const formatDateInterval = (start: string, end: string): string => {
			const startDate = normalizeDateString(start);
			const endDate = normalizeDateString(end);
			
			const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
			const startDay = startDate.getDate();
			const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
			const endDay = endDate.getDate();
			
			if (startMonth === endMonth) {
				return `${startMonth} ${startDay} - ${endDay}`;
			}
			return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
		};

		// Gera dados da semana atual
		const currentWeek: {
			date: string;
			label: string;
			hasLogin: boolean;
			isToday: boolean;
		}[] = [];

		for (let i = 0; i < 7; i++) {
			const current = new Date(startOfCurrentWeek.getTime() + i * ONE_DAY_MS);
			const dateString = formatLocalDate(current);
			const label = current
				.toLocaleDateString("en-US", { weekday: "short" })
				.slice(0, 2)
				.toUpperCase();

			currentWeek.push({
				date: dateString,
				label,
				hasLogin: loginDates.has(dateString),
				isToday: dateString === todayString,
			});
		}

		// Gera dados da semana anterior
		const previousWeek: {
			date: string;
			label: string;
			hasLogin: boolean;
			isToday: boolean;
		}[] = [];

		for (let i = 0; i < 7; i++) {
			const current = new Date(startOfPreviousWeek.getTime() + i * ONE_DAY_MS);
			const dateString = formatLocalDate(current);
			const label = current
				.toLocaleDateString("en-US", { weekday: "short" })
				.slice(0, 2)
				.toUpperCase();

			previousWeek.push({
				date: dateString,
				label,
				hasLogin: loginDates.has(dateString),
				isToday: false,
			});
		}

		const currentWeekCount = currentWeek.filter((d) => d.hasLogin).length;
		const previousWeekCount = previousWeek.filter((d) => d.hasLogin).length;

		return {
			currentWeek,
			previousWeek,
			currentWeekCount,
			previousWeekCount,
			currentWeekStart: startCurrentString,
			currentWeekEnd: endCurrentString,
			previousWeekStart: startPreviousString,
			previousWeekEnd: endPreviousString,
			currentWeekFormatted: formatDateInterval(startCurrentString, endCurrentString),
			previousWeekFormatted: formatDateInterval(startPreviousString, endPreviousString),
		};
	},
});
