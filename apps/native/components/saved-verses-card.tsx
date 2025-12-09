import React from "react";
import { View, Text, Platform, Pressable } from "react-native";
import { Card, useThemeColor } from "heroui-native";
import { useAppTheme } from "@/contexts/app-theme-context";
import { Heart, ArrowRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { router } from "expo-router";

type Props = {
  maxItems?: number;
};

export default function SavedVersesCard({ maxItems = 3 }: Props) {
  const themeColorPrimary = useThemeColor("primary" as any);
  const foregroundColor = useThemeColor("foreground");
  const { isDark } = useAppTheme();
  const { t } = useTranslation();

  const savedVerses = useQuery(api.dailyStudy.getSavedVerses);
  const isLoading = savedVerses === undefined;

  // Pega os primeiros maxItems (já vem ordenado do backend)
  const recentVerses = React.useMemo(() => {
    if (!savedVerses || !Array.isArray(savedVerses)) return [];
    return savedVerses.slice(0, maxItems);
  }, [savedVerses, maxItems]);

  // Verifica se savedVerses existe, é um array e tem itens
  const hasVerses = savedVerses !== undefined && Array.isArray(savedVerses) && savedVerses.length > 0;

  return (
    <Pressable 
      onPress={() => router.push("/(auth)/(tabs)/saved")}
      className={`w-full  ${Platform.OS === "ios" ? "mb-15" : "mb-5"}`}
    >
      <Card className="shadow-2xl bg-card border-popover rounded-2xl">
        <View>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text
                  className="text-xl font-bold mb-1"
                  style={{ color: foregroundColor }}
                >
                  {t("home.savedVerses", "Versos Salvos")}
                </Text>
                <Text
                  className="text-sm opacity-80"
                  style={{ color: foregroundColor }}
                >
                  {isLoading
                    ? t("home.loading", "Carregando...")
                    : hasVerses
                    ? t("home.savedVersesCount", `${savedVerses?.length ?? 0} versos salvos`)
                    : t("home.noSavedVerses", "Nenhum verso salvo ainda")}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: themeColorPrimary,
                  borderRadius: 20,
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Heart 
                  size={24} 
                  color={isDark ? "#000" : "#fff"} 
                  fill={isDark ? "#000" : "#fff"} 
                />
              </View>
            </View>

            {/* Verses List */}
            {isLoading ? (
              <View className="py-4">
                <Text
                  className="text-sm opacity-60"
                  style={{ color: foregroundColor }}
                >
                  {t("home.loading", "Carregando...")}
                </Text>
              </View>
            ) : hasVerses ? (
              <View className="gap-3">
                {recentVerses.map((verse, index) => (
                  <View
                    key={verse._id}
                    className="pb-3"
                    style={{
                      borderBottomWidth: index < recentVerses.length - 1 ? 1 : 0,
                      borderBottomColor: isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold mb-1 opacity-70"
                      style={{ color: foregroundColor }}
                    >
                      {verse.reference}
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: foregroundColor }}
                      numberOfLines={2}
                    >
                      {verse.text}
                    </Text>
                  </View>
                ))}
                {savedVerses && savedVerses.length > maxItems && (
                  <View className="flex-row items-center justify-end pt-2">
                    <Text
                      className="text-sm font-semibold mr-2"
                      style={{ color: themeColorPrimary }}
                    >
                      {t("home.seeAll", "Ver todos")}
                    </Text>
                    <ArrowRight size={16} color={themeColorPrimary} />
                  </View>
                )}
              </View>
            ) : (
              <View className="py-4">
                <Text
                  className="text-sm opacity-60"
                  style={{ color: foregroundColor }}
                >
                  {t("home.startSaving", "Comece a salvar versos para vê-los aqui")}
                </Text>
              </View>
            )}
          </View>
      </Card>
    </Pressable>
  );
}

