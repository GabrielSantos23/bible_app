import React from "react";
import { View, Text, Platform, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native";
import { GlassView } from "expo-glass-effect";
import { useAppTheme } from "@/contexts/app-theme-context";
import { Flame, Check, Menu } from "lucide-react-native";
import { CircularGauge } from "@/components/CircularGauge";

type WeekDay = {
  date: string;
  label: string;
  hasLogin: boolean;
  isToday?: boolean;
};

type Props = {
  week?: WeekDay[];
  isLoading?: boolean;
  onPressStats?: () => void;
  currentStreak?: number;
};

export default function HeatherWeek({ week, isLoading, onPressStats, currentStreak = 0 }: Props) {
  const { isDark } = useAppTheme();

  const androidGradientColors: [string, string] = isDark
    ? ["rgba(0, 0, 0, 0.49)", "rgba(0, 0, 0, 0.35)"]
    : ["rgba(255, 255, 255, 0.32)", "rgba(255, 255, 255, 0.18)"];

  const fallbackWeek =
    week ??
    Array.from({ length: 7 }).map((_, idx) => ({
      date: "--",
      label: ["S", "M", "T", "W", "T", "F", "S"][idx % 7],
      hasLogin: false,
      isToday: idx === 6,
    }));

  return (
    <View className="items-center justify-start w-full">
      {/* Container principal: Removemos a borda daqui */}
      <View className="w-full overflow-hidden rounded-b-4xl shadow-lg relative">
        {/* Background gradient OUTSIDE BlurView for Android */}
        {Platform.OS === "android" && (
          <LinearGradient
            colors={androidGradientColors}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}

        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 100}
          tint={isDark ? "dark" : "light"}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          className="flex-row items-center justify-between pt-15 p-4 w-full"
        >
          {Platform.OS === "ios" && (
            <GlassView
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              glassEffectStyle="clear"
              pointerEvents="none"
            />
          )}

          {/* Semi-transparent overlay for Android */}
          {Platform.OS === "android" && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.2)",
              }}
              pointerEvents="none"
            />
          )}

          <Pressable
            onPress={onPressStats}
            className="w-12 h-12 bg-foreground/10 rounded-full items-center justify-center"
          >
            <Menu color={isDark ? "#ffffff" : "#000000"} />
          </Pressable>

          <View className="flex-1 flex-row justify-between px-4">
            {fallbackWeek.map((day) => (
              <DayItem
                key={day.date + day.label}
                day={day.label}
                date={day.date}
                isDark={isDark}
                hasLogin={day.hasLogin}
                isToday={day.isToday}
                isLoading={isLoading}
              />
            ))}
          </View>

          <Pressable onPress={onPressStats} className="w-12 h-12 items-center justify-center">
            <CircularGauge
              value={isLoading ? 0 : Math.min(currentStreak, 7)}
              max={7}
              radius={24}
              strokeWidth={4}
              activeColor={"#22c55e"}
              backgroundColor="rgba(255,255,255,0.1)"
              thumbColor="#ffffff"
              showCenterText={true}
              centerTextColor="#ffffff"
              centerTextSize={12}
              showLabel={false}
            />
          </Pressable>
        </BlurView>

        <View 
          className="absolute inset-0 rounded-b-4xl border-foreground/30 border border-t-0" 
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

function DayItem({
  day,
  date,
  isDark,
  hasLogin,
  isToday,
  isLoading,
}: {
  day: string;
  date: string;
  isDark: boolean;
  hasLogin: boolean;
  isToday?: boolean;
  isLoading?: boolean;
}) {
  const activeColor = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.9)";
  const inactiveColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";

  return (
    <View
      className="items-center justify-center rounded-xl w-[30px] py-2 relative"
      style={{
        backgroundColor: hasLogin ? "rgba(255,255,255,0.18)" : "transparent",
        borderWidth: isToday ? 1 : 0,
        borderColor: "rgba(255,255,255,0.3)",
      }}
    >
      <Text className="text-xs font-bold" style={{ color: hasLogin ? activeColor : inactiveColor }}>
        {isLoading ? "•" : day}
      </Text>
      <Text className="text-xs font-bold" style={{ color: hasLogin ? activeColor : inactiveColor }}>
        {isLoading ? "••" : date.slice(-2)}
      </Text>
      {hasLogin && !isLoading && (
        <View
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            backgroundColor: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
            borderRadius: 8,
            width: 14,
            height: 14,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={10} color={isDark ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)"} strokeWidth={3} />
        </View>
      )}
    </View>
  );
}