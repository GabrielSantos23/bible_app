import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Card, useThemeColor } from "heroui-native";
import { useQuery } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import HeatherWeek from "@/components/heather-week";
import { useAppTheme } from "@/contexts/app-theme-context";
import { Flame, CalendarRange, Target, Clock } from "lucide-react-native";
import { useTranslation } from "react-i18next";

export default function StatsScreen() {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor("background");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const cardBg = useThemeColor("card");
  const { isDark } = useAppTheme();

  const weeklyLogins = useQuery(api.dailyLogins.getWeeklyLogins, {});
  const loginStats = useQuery(api.dailyLogins.getLoginStats, {});

  const weekCount = weeklyLogins?.filter((d) => d.hasLogin).length ?? 0;

  const lastLoginHuman = useMemo(() => {
    if (!loginStats?.lastLoginDate) return t("stats.noActivity", "Nenhum login registrado");
    const dateObj = new Date(`${loginStats.lastLoginDate}T00:00:00`);
    return dateObj.toLocaleDateString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  }, [loginStats?.lastLoginDate, t]);

  return (
    <ScrollView style={{ backgroundColor }} className="flex-1" contentContainerClassName="pb-10">
      <View className="px-6 pt-8 gap-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-foreground">
              {t("stats.title", "Seu progresso")}
            </Text>
            <Text className="text-muted text-sm">
              {t("stats.subtitle", "Acompanhe sua sequência e presença semanal")}
            </Text>
          </View>
        </View>

        <HeatherWeek
          week={weeklyLogins ?? []}
          isLoading={weeklyLogins === undefined || loginStats === undefined}
          currentStreak={loginStats?.currentStreak ?? 0}
        />

        <View className="flex-row gap-3">
          <InfoCard
            icon={<Flame size={18} color={isDark ? "white" : "black"} />}
            title={t("stats.currentStreak", "Sequência atual")}
            value={loginStats?.currentStreak ?? 0}
            description={t("stats.keepGoing", "Continue voltando todos os dias!")}
            background={cardBg}
            foreground={foreground}
            muted={muted}
          />
          <InfoCard
            icon={<Target size={18} color={isDark ? "white" : "black"} />}
            title={t("stats.longestStreak", "Melhor sequência")}
            value={loginStats?.longestStreak ?? 0}
            description={t("stats.personalRecord", "Seu recorde até agora")}
            background={cardBg}
            foreground={foreground}
            muted={muted}
          />
        </View>

        <View className="flex-row gap-3">
          <InfoCard
            icon={<CalendarRange size={18} color={isDark ? "white" : "black"} />}
            title={t("stats.weeklyPresence", "Presença na semana")}
            value={`${weekCount}/7`}
            description={t("stats.weeklyDescription", "Dias que você entrou nesta semana")}
            background={cardBg}
            foreground={foreground}
            muted={muted}
          />
          <InfoCard
            icon={<Clock size={18} color={isDark ? "white" : "black"} />}
            title={t("stats.lastLogin", "Último acesso")}
            value={loginStats?.lastLoginDate ? lastLoginHuman : "-"}
            description={loginStats?.lastLoginDate ? t("stats.keepStreak", "Mantenha a sequência viva") : t("stats.noActivity", "Nenhum login registrado")}
            background={cardBg}
            foreground={foreground}
            muted={muted}
          />
        </View>

        <Card className="p-4 rounded-2xl mt-2">
          <Text className="text-lg font-semibold text-foreground">
            {t("stats.totalLogins", "Total de entradas")}
          </Text>
          <Text className="text-3xl font-black text-foreground mt-1">
            {loginStats?.totalLogins ?? 0}
          </Text>
          <Text className="text-muted mt-1">
            {t("stats.totalDescription", "Somatório de todas as vezes que você acessou o app")}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

type InfoCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  background: string;
  foreground: string;
  muted: string;
};

function InfoCard({ icon, title, value, description, background, foreground, muted }: InfoCardProps) {
  return (
    <Card className="flex-1 p-4 rounded-2xl" style={{ backgroundColor: background }}>
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-sm font-semibold" style={{ color: muted }}>
          {title}
        </Text>
      </View>
      <Text className="text-2xl font-bold mt-1" style={{ color: foreground }}>
        {value}
      </Text>
      <Text className="text-xs mt-1" style={{ color: muted }}>
        {description}
      </Text>
    </Card>
  );
}

