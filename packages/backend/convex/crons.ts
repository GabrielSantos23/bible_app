import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Cron Job para buscar o devocional diário
 * Executa todos os dias às 00:00 UTC (meia-noite UTC)
 * 
 * Para ajustar o horário:
 * - hourUTC: 0-23 (hora em UTC)
 * - minuteUTC: 0-59 (minuto em UTC)
 * 
 * Exemplos:
 * - { hourUTC: 0, minuteUTC: 0 } = 00:00 UTC (meia-noite UTC)
 * - { hourUTC: 6, minuteUTC: 0 } = 06:00 UTC
 * - { hourUTC: 3, minuteUTC: 30 } = 03:30 UTC
 */
crons.daily(
	"fetch daily devotional",
	{ hourUTC: 0, minuteUTC: 0 }, // Executa à meia-noite UTC
	internal.dailyStudy.fetchDailyDevotional
);

export default crons;






