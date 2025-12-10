import React, { useCallback, useMemo, useRef } from "react";
import { Image, Platform, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { Button, Card, ScrollShadow, useThemeColor } from "heroui-native";
import { useQuery } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { useAppTheme } from "@/contexts/app-theme-context";
import { Flame, Check, ArrowLeft, SeparatorVertical, Share, Copy, Download } from "lucide-react-native";
import { useTranslation } from "react-i18next";
const fireIconDark = require("@/assets/icons/fire-icon-dark.png");
const fireIconLight = require("@/assets/icons/fire-icon-light.png");
const fireIcon = require("@/assets/icons/fire-icon.png");
import { router } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Background } from "@react-navigation/elements";
import { t } from "i18next";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';


const getMotivationalKey = (streak: number): string => {
  if (streak === 0) return "stats.motivational.day0";
  if (streak === 1) return "stats.motivational.day1";
  if (streak === 2) return "stats.motivational.day2";
  if (streak === 3) return "stats.motivational.day3";
  if (streak === 4) return "stats.motivational.day4";
  if (streak === 5) return "stats.motivational.day5";
  if (streak === 6) return "stats.motivational.day6";
  if (streak === 7) return "stats.motivational.day7";
  if (streak < 14) return "stats.motivational.week2";
  if (streak === 14) return "stats.motivational.day14";
  if (streak < 21) return "stats.motivational.week3";
  if (streak === 21) return "stats.motivational.day21";
  if (streak < 30) return "stats.motivational.almostMonth";
  if (streak === 30) return "stats.motivational.day30";
  if (streak < 60) return "stats.motivational.month2";
  if (streak === 60) return "stats.motivational.day60";
  if (streak < 90) return "stats.motivational.month3";
  if (streak === 90) return "stats.motivational.day90";
  if (streak === 100) return "stats.motivational.day100";
  if (streak > 100) return "stats.motivational.beyond100";
  
  return "stats.motivational.default";
};

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const backgroundColor = useThemeColor("background");

  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const cardBg = useThemeColor("card" as any);
  const { isDark } = useAppTheme();

  const weeklyLogins = useQuery(api.dailyLogins.getWeeklyLogins, {});
  const loginStats = useQuery(api.dailyLogins.getLoginStats, {});

  const weekCount = weeklyLogins?.filter((d) => d.hasLogin).length ?? 0;



  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const currentStreak = loginStats?.currentStreak ?? 0;
  const motivationalKey = getMotivationalKey(currentStreak);
  const motivationalMessage = t(motivationalKey, { days: currentStreak });

  const formatLastLoginDate = (dateString: string): string => {
    const date = new Date(`${dateString}T00:00:00`);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return t('common.today', 'Hoje');
    } else if (date.getTime() === yesterday.getTime()) {
      return t('common.yesterday', 'Ontem');
    } else {
      const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
      return date.toLocaleDateString(locale, { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric" 
      });
    }
  };

  // Get day numbers for the week
  const weekDayNumbers = useMemo(() => {
    if (!weeklyLogins) return [];
    return weeklyLogins.map(day => {
      const date = new Date(`${day.date}T00:00:00`);
      return date.getDate();
    });
  }, [weeklyLogins]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1" style={{ backgroundColor: backgroundColor }} >
  <Pressable 
                onPress={() => router.back()}
                className="absolute top-12 left-6 z-10"
            >
                {Platform.OS === 'ios' ? (
                    <GlassView 
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        isInteractive
                    >
                        <ArrowLeft size={24} color={foreground} />
                    </GlassView>
                ) : (
                    <View 
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: backgroundColor,
                            opacity: 0.9,
                            shadowColor: '#000',
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }}
                        
                    >
                        <ArrowLeft size={24} color={foreground} />
                    </View>
                )}
            </Pressable>
            <ScrollShadow 
                LinearGradientComponent={LinearGradient}
                size={80}
                color={backgroundColor}
                className="flex-1"
            >

    <ScrollView className="flex-1" contentContainerClassName="pb-10">
    <View className="items-center justify-center flex-colum py-10 px-4 gap-y-2">
      <Image source={fireIcon} className="w-40 h-40" />

      <Text className="text-6xl font-black mb-2" style={{ color: foreground }}>
            {loginStats?.currentStreak ?? 0}
          </Text>
          <Text className="text-2xl text-foreground font-bold">
            {t('stats.weekStreak', "Week Streak")}
          </Text>
          <View className="mt-2 items-center justify-center flex-row">
          <Text 
            className="text-center text-base font-semibold"
            style={{ color: foreground }}
          >
            {motivationalMessage}
          </Text>
        </View>

    </View>
    <View className="flex-row justify-center items-center gap-2 mb-2 px-4">
            {weekDays.map((day, index) => {
              const hasLogin = weeklyLogins?.[index]?.hasLogin ?? false;
              return (
                <View key={index} className="items-center gap-1">
                  <Text className="text-xs mb-1 text-foreground font-bold" >
                    {day}
                  </Text>
                  <View 
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: hasLogin ? '#FF6B35' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                    }}
                  >
                    {hasLogin ? (
                      <Check size={20} color={isDark ? "#ffffff" : "#000000"} strokeWidth={3} />
                    ) : (
                      <Text className="text-xs font-semibold text-foreground" >
                        {weekDayNumbers[index] || '-'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
    </View>
   <View className="flex-col justify-center items-center gap-2 mb-2 px-1 bg-card mx-1 rounded-2xl">

    <Text className="text-xl text-foreground font-bold ">{t('stats.yourStats')}</Text>

    <View className="flex-row justify-between px-2 py-4 items-center gap-2 mb-1 w-full rounded-xl" style={{ backgroundColor: backgroundColor }}>
      <StatBox label={t('stats.currentStreak')} value={loginStats?.currentStreak ?? 0} />
      <View
        style={{
          width: 0.5,
          alignSelf: 'stretch',
          marginHorizontal: 8,
        }}
        className="bg-foreground/10"
      />
      <StatBox label={t('stats.longestStreak')} value={loginStats?.longestStreak ?? 0} />
      <View
        style={{
          width: 0.5,
          alignSelf: 'stretch',
          marginHorizontal: 8,
        }}
        className="bg-foreground/10"

      />
      <StatBox 
        label={t('stats.averageLogins')} 
        value={loginStats?.averageLoginsPerDay ? Number(loginStats.averageLoginsPerDay.toFixed(1)) : 0} 
      />
    </View>

    <View className="flex-row justify-center items-center px-2 py-2 mb-1 w-full rounded-xl" style={{ backgroundColor: backgroundColor }}>
      <Text className="text-base text-foreground font-semibold mr-2">
        {t('stats.lastLogin')}:
      </Text>
      <Text className="text-base text-foreground font-bold">
        {loginStats?.lastLoginDate 
          ? formatLastLoginDate(loginStats.lastLoginDate) 
          : t('stats.never')
        }
      </Text>
    </View>
   </View>
   <View className="px-4 py-2 w-full">
      <BottomSheetStats />
    </View>
    </ScrollView>
    </ScrollShadow>
      </View>
    </GestureHandlerRootView>
  );
}

type StatBoxProps = {
  label: string;
  value: number;
};

function StatBox({ label, value}: StatBoxProps) {
  const foreground = useThemeColor("foreground");
  
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-sm text-foreground font-semibold text-center mb-1" numberOfLines={2}>
        {label}
      </Text>
      <Text className="text-2xl text-foreground font-bold" style={{ color: foreground }}>
        {value}
      </Text>
    </View>
  );
}

function BottomSheetStats() {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor("background");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const cardBg = useThemeColor("card" as any);
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const weeklyComparison = useQuery(api.dailyLogins.getWeeklyComparison, {});
  const userData = useQuery(api.auth.getCurrentUser);
  const userName = userData?.name || t('common.user');

  // Snap points para o bottom sheet
  const snapPoints = useMemo(() => ['50%', '75%'], []);

  // Callback para quando o sheet muda de posição
  const handleSheetChanges = useCallback((index: number) => {
    console.log('Bottom sheet index:', index);
  }, []);

  // Função para abrir o bottom sheet
  const handlePresentModalPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // Função para fechar o bottom sheet
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  return (
    <>
      <Button 
        variant="ghost" 
        className="text-foreground bg-card"
        onPress={handlePresentModalPress}
      >
        {t('stats.moreOptions', 'More Options')}
      </Button>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onChange={handleSheetChanges}
        backgroundStyle={{ backgroundColor: cardBg }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: foreground }]}>
              {t('stats.insights', 'Insights')}
            </Text>
          </View>
          
          <View style={[styles.bottomSheetDescription, { backgroundColor: backgroundColor, borderRadius: 8 }]}>
            <Text style={[styles.descriptionText, { color: foreground }]}>
              {userName}, {t('stats.insightsMessage', 'you read more this week so far compared to last week. Great work!')}
            </Text>
          </View>

          <Button
            variant="ghost"
            size="lg"
            className="self-stretch mt-4 text-foreground bg-card"
            onPress={handleClose}
          >
            {t('common.close', 'Close')}
          </Button>
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  bottomSheetContent: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  bottomSheetHeader: {
    marginBottom: 8,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bottomSheetDescription: {
    padding: 16,
    marginTop: 16,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 22,
  },
});