import React from "react";
import { View, Text, Pressable } from "react-native";
import { Card, useThemeColor } from "heroui-native";
import { useAppTheme } from "@/contexts/app-theme-context";

type Props = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  onPress: () => void;
};

export default function QuickActionCard({ title, description, icon, onPress }: Props) {
  const themeColorPrimary = useThemeColor("primary" as any);
  const { isDark } = useAppTheme();

  return (
    <Pressable onPress={onPress} className="w-full mb-4">
      <Card className="shadow-2xl bg-card border-popover rounded-2xl">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-foreground text-lg font-bold mb-1">
              {title}
            </Text>
            {description && (
              <Text className="text-foreground text-sm opacity-80">
                {description}
              </Text>
            )}
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
            {icon}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

