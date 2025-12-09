import React from "react";
import { View, Text, Pressable } from "react-native";
import { Card, useThemeColor } from "heroui-native";
import { useAppTheme } from "@/contexts/app-theme-context";
import { ArrowUpRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";

type Props = {
  devotional?: {
    reference?: string;
  } | null;
  onPress: () => void;
};

export default function ContextChapterCard({ devotional, onPress }: Props) {
  const themeColorPrimary = useThemeColor("primary" as any);
  const { isDark } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress} className="w-full mb-4 mt-4">
      <Card className="shadow-2xl bg-card border-popover rounded-2xl">
        <View className="flex-col gap-y-3 text-foreground">
          <View className="flex-row justify-between">
            <Text className="text-foreground">
              {t('home.contextChapter', "Contexto do Capítulo")}
            </Text>
            <View className="bg-primary rounded-full p-0.5">
              <ArrowUpRight size={20} color={"black"} />
            </View>
          </View>
          {devotional ? (
            <Text className="text-foreground">
              {t('home.whatDoesMean', { reference: devotional?.reference }, `O que significa ${devotional?.reference}?`)}
            </Text>
          ) : (
            <Text className="text-foreground opacity-60">
              {t('home.loadingDevotional', "Carregando devocional...")}
            </Text>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

