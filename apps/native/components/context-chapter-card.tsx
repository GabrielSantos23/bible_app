import React from "react";
import { View, Text, Pressable } from "react-native";
import { Card, useThemeColor } from "heroui-native";
import { useAppTheme } from "@/contexts/app-theme-context";
import { ArrowUpRight, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";

type Props = {
  devotional?: {
    reference?: string;
  } | null;
  onPress: () => void;
};

export default function ContextChapterCard({ devotional, onPress }: Props) {
  const { isDark } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress} className="w-full mb-4 mt-4">
      <Card className="shadow-2xl bg-card  border border-foreground/10 rounded-2xl">
        <View className="flex-row gap-y-3 text-foreground justify-between items-center">
          <View className="flex-col gap-y-1">

          <Text className="text-foreground font-bold text-lg">
              {t('home.contextChapter', "Contexto do Capítulo")}
            </Text>
          {devotional ? (
            <Text className="text-foreground ">
              {t('home.whatDoesMean', { reference: devotional?.reference }, `O que significa ${devotional?.reference}?`)}
            </Text>
          ) : (
            <Text className="text-foreground opacity-60">
              {t('home.loadingDevotional', "Carregando devocional...")}
            </Text>
          )}
          </View>
          <View className=" rounded-full p-0.5">
              <ChevronRight size={20} color={isDark ? "#ffffff" : "#000000"} />
            </View>
        </View>
      </Card>
    </Pressable>
  );
}

