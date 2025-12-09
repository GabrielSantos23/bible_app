import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Card, useThemeColor } from "heroui-native";
import { useAppTheme } from "@/contexts/app-theme-context";
import { Check, Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";

type WeekDay = {
  date: string;
  label: string;
  hasLogin: boolean;
  isToday?: boolean;
};

type Props = {
  week?: WeekDay[];
  isLoading?: boolean;
  onClaimReward?: () => void;
};

export default function WeeklyProgressCard({ week, isLoading, onClaimReward }: Props) {
  const themeColorPrimary = useThemeColor("primary" as any);
  const foregroundColor = useThemeColor("foreground");
  const { isDark } = useAppTheme();
  const { t } = useTranslation();

  const fallbackWeek =
    week ??
    Array.from({ length: 7 }).map((_, idx) => ({
      date: "--",
      label: ["S", "M", "T", "W", "T", "F", "S"][idx % 7],
      hasLogin: false,
      isToday: idx === 6,
    }));

  const completedDays = useMemo(() => {
    return fallbackWeek.filter((day) => day.hasLogin).length;
  }, [fallbackWeek]);

  const isPerfectWeek = completedDays === 7;
  const fullDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <View className="w-full mb-4">
      <Card className="shadow-2xl bg-card border-popover rounded-2xl">
        <View>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text
                  className="text-2xl font-bold mb-1"
                  style={{ color: foregroundColor }}
                >
                  {isPerfectWeek
                    ? t("home.perfectWeek", "Semana Perfeita!")
                    : t("home.weeklyProgress", "Progresso Semanal")}
                </Text>
                <Text
                  className="text-sm opacity-80"
                  style={{ color: foregroundColor }}
                >
                  {isPerfectWeek
                    ? t("home.perfectWeekMessage", "Uau! Você completou 7 dias seguidos!")
                    : t("home.weeklyProgressMessage", `Continue! Você já completou ${completedDays} de 7 dias.`)}
                </Text>
              </View>
              {isPerfectWeek && (
                <View
                  style={{
                    backgroundColor: themeColorPrimary,
                    borderRadius: 20,
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Star size={24} color={isDark ? "#000" : "#fff"} fill={isDark ? "#000" : "#fff"} />
                </View>
              )}
            </View>

            {/* Days Row */}
            <View className="flex-row justify-between mb-6">
              {fallbackWeek.map((day, index) => {

                const fullDayLabel = fullDayLabels[index];
                return (
                  <View key={day.date + day.label} className="items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mb-2"
                      style={{
                        backgroundColor: day.hasLogin
                          ? themeColorPrimary
                          : isDark
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.1)",
                        borderWidth: day.isToday ? 2 : 0,
                        borderColor: themeColorPrimary,
                      }}
                    >
                      {day.hasLogin && !isLoading ? (
                        <Check
                          size={20}
                          color={isDark ? "#000" : "#fff"}
                          strokeWidth={3}
                        />
                      ) : (
                        <Text
                          className="text-xs font-bold"
                          style={{
                            color: day.hasLogin
                              ? isDark
                                ? "#000"
                                : "#fff"
                              : isDark
                              ? "rgba(255, 255, 255, 0.4)"
                              : "rgba(0, 0, 0, 0.4)",
                          }}
                        >
                          {isLoading ? "•" : day.label}
                        </Text>
                      )}
                    </View>
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: day.hasLogin
                          ? foregroundColor
                          : isDark
                          ? "rgba(255, 255, 255, 0.5)"
                          : "rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      {isLoading ? "••" : fullDayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
        </View>
      </Card>
    </View>
  );
}

