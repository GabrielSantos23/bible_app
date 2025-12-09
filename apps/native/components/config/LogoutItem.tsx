import React, { useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Dialog, useThemeColor } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/app-theme-context';

export function LogoutItem({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const mutedColor = useThemeColor('muted');
  const destructiveColor = '#ef4444'; // red-500
  const { isDark } = useAppTheme();

  const handleConfirmLogout = () => {
    setIsOpen(false);
    // Wait for dialog close animation before logging out
    setTimeout(() => {
      onLogout();
    }, 300);
  };

  return (
    <Dialog 
      isOpen={isOpen} 
      onOpenChange={setIsOpen}
      closeDelay={200}
      progressAnimationConfigs={{
        onOpen: {
          animationType: 'spring',
          animationConfig: { damping: 20, stiffness: 200 },
        },
        onClose: {
          animationType: 'timing',
          animationConfig: { duration: 200 },
        },
      }}
    >
      <Dialog.Trigger asChild>
        <TouchableOpacity
          className="flex-row items-center rounded-2xl border border-muted-foreground/40 p-4 mb-1"
          style={styles.borderCurve}
          onPress={() => setIsOpen(true)}
        >
          <View className="w-5 mr-3">
            <LogOut size={20} color={isDark ? "white": "black"} />
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-base font-semibold">
              {t('settings.logout', 'Log Out')}
            </Text>
            <Text className="text-muted text-sm">
              {t('settings.logoutDescription', 'Sign out of your account')}
            </Text>
          </View>
        </TouchableOpacity>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="bg-transparent">
          <BlurView 
            style={StyleSheet.absoluteFill} 
            intensity={20}
            tint="dark"
          />
        </Dialog.Overlay>
        
        <Dialog.Content 
          className="bg-card rounded-3xl p-6 mx-4 max-w-md"
          style={styles.borderCurve}
        >
          <Dialog.Close />
          
          <View className="mb-6 gap-2">
            <Text className="text-foreground text-xl font-bold">
              {t('settings.confirmLogout', 'Confirm Logout')}
            </Text>
            <Dialog.Description className="text-muted text-base">
              {t('settings.confirmLogoutMessage', 'Are you sure you want to log out? You will need to sign in again to access your account.')}
            </Dialog.Description>
          </View>

          <View className="flex-row justify-end gap-3">
            <Dialog.Close asChild>
              <TouchableOpacity
                className="px-5 py-3 rounded-xl"
                style={[styles.borderCurve, { backgroundColor: mutedColor + '20' }]}
              >
                <Text className="text-foreground font-semibold">
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
            </Dialog.Close>

            <TouchableOpacity
              className="px-5 py-3 rounded-xl"
              style={[styles.borderCurve, { backgroundColor: destructiveColor }]}
              onPress={handleConfirmLogout}
            >
              <Text className="text-white font-semibold">
                {t('settings.logout', 'Log Out')}
              </Text>
            </TouchableOpacity>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  borderCurve: {
    borderCurve: 'continuous',
  },
});