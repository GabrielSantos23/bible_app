import { RefreshControl, ScrollView, View } from "react-native";
import { useThemeColor } from "heroui-native";
import { VerseOfDay } from "@/components/verse-of-day";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useQuery } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { router } from "expo-router";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useTranslation } from 'react-i18next';
import HeatherWeek from "@/components/heather-week";
import WeeklyProgressCard from "@/components/weekly-progress-card";
import QuickActionCard from "@/components/quick-action-card";
import SavedVersesCard from "@/components/saved-verses-card";
import ContextChapterCard from "@/components/context-chapter-card";
import { Search } from "lucide-react-native";

const HEADER_HEIGHT = 180;

export default function Home() {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor("background");
  const { language } = useAppSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const previousDevotionalRef = useRef<any>(null);
  const { isDark } = useAppTheme();
  
  const devotional = useQuery(
    api.dailyStudy.getTodayDevotional, 
    { language, _refreshKey: refreshKey }
  );
  const weeklyLogins = useQuery(api.dailyLogins.getWeeklyLogins, {});
  const loginStats = useQuery(api.dailyLogins.getLoginStats, {});

  useEffect(() => {
    if (refreshing && devotional !== undefined) {
      setRefreshing(false);
    }
    previousDevotionalRef.current = devotional;
  }, [devotional, refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor }}>
      <View 
        className="absolute top-0 left-0 right-0" 
        style={{ 
          zIndex: 10,
          pointerEvents: 'box-none' // Allow touches to pass through
        }}
      >
        <HeatherWeek 
          week={weeklyLogins ?? []}
          isLoading={weeklyLogins === undefined || loginStats === undefined}
          currentStreak={loginStats?.currentStreak ?? 0}
          onPressStats={() => router.push("/(auth)/(tabs)/stats")}
        />
      </View>
      
      <ScrollView 
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            progressViewOffset={HEADER_HEIGHT}
            tintColor={isDark ? "#fff" : "#000"} // iOS color
            colors={[isDark ? "#fff" : "#000"]} // Android color
          />
        }
      >
        <VerseOfDay />

        <ContextChapterCard
          devotional={devotional ?? null}
          onPress={() => router.push("/(auth)/verse-details")}
        />

        {/* <WeeklyProgressCard 
          week={weeklyLogins ?? []}
          isLoading={weeklyLogins === undefined || loginStats === undefined}
          onClaimReward={() => {
            // TODO: Implementar lógica de recompensa
            console.log("Recompensa reivindicada!");
          }}
        /> */}
        
        <QuickActionCard
          title={t('home.searchVerse', "Buscar Verso")}
          description={t('home.searchVerseDescription', "Encontre versículos na Bíblia")}
          icon={<Search size={24} color={isDark ? "#000" : "#fff"} />}
          onPress={() => router.push("/(auth)/(tabs)/two")}
        />
        
        <SavedVersesCard maxItems={3} />
        
        
     
      </ScrollView>
    </View>
  );
}