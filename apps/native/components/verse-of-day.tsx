import { useMutation, useQuery, useAction } from "convex/react";
import { View, Text, ImageBackground, Share, AppState, AppStateStatus, Platform, Pressable } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { useAppSettings } from "@/contexts/app-settings-context";
import { Heart, Share2 } from "lucide-react-native";
import { Button, Skeleton, Spinner, useThemeColor } from "heroui-native";
import { GlassView } from "expo-glass-effect";
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

/**
 * Hook para detectar mudança de dia e forçar atualização do verso
 * Usa 3 estratégias combinadas:
 * 1. Timeout para meia-noite (precisão)
 * 2. Verificação periódica de 1 minuto (rede de segurança)
 * 3. AppState listener (quando app volta ao foreground)
 */
function useDayChangeDetection() {
  const [refreshKey, setRefreshKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCheckedDateRef = useRef<string>(getCurrentDateString());

  function getCurrentDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  function getMillisecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }

  function checkAndUpdateIfNeeded() {
    const currentDate = getCurrentDateString();
    if (currentDate !== lastCheckedDateRef.current) {
      lastCheckedDateRef.current = currentDate;
      setRefreshKey((prev) => prev + 1);
    }
  }

  function scheduleMidnightUpdate() {
    // Limpa timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const msUntilMidnight = getMillisecondsUntilMidnight();
    
    timeoutRef.current = setTimeout(() => {
      checkAndUpdateIfNeeded();
      // Reagenda para a próxima meia-noite
      scheduleMidnightUpdate();
    }, msUntilMidnight);
  }

  useEffect(() => {
    // Estratégia 1: Timeout para meia-noite ⏰
    scheduleMidnightUpdate();

    // Estratégia 2: Verificação periódica de 1 minuto 🔄
    intervalRef.current = setInterval(() => {
      checkAndUpdateIfNeeded();
    }, 60000); // 1 minuto

    // Estratégia 3: AppState Listener 📱
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          // App voltou ao foreground, verifica se mudou o dia
          checkAndUpdateIfNeeded();
        }
      }
    );

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, []);

  return refreshKey;
}

export function VerseOfDay() {
  const { language } = useAppSettings();
  const { t } = useTranslation();
  const refreshKey = useDayChangeDetection();
  const fetchManual = useAction(api.dailyStudy.fetchDailyDevotionalManual);
  const fetchingRef = useRef(false);
  
  // Usa refreshKey para forçar atualização quando detecta mudança de dia
  // O refreshKey muda quando passa a meia-noite, forçando o useQuery a refazer a busca
  const devotional = useQuery(
    api.dailyStudy.getTodayDevotional, 
    { language, _refreshKey: refreshKey } // _refreshKey não é usado no backend, mas força refetch
  );
  const isLoading = devotional === undefined;
  const foregroundColor = useThemeColor("foreground");
  const cardColor = useThemeColor("card" as any);

  const unsaveDevotional = useMutation(api.dailyStudy.unsaveDevotional);
  const saveDevotional = useMutation(api.dailyStudy.saveDevotional);

  // Função para verificar se precisa buscar da API
  const checkAndFetchIfNeeded = useCallback(async () => {
    // Previne múltiplas chamadas simultâneas
    if (fetchingRef.current) {
      console.log("Já existe uma busca em andamento, ignorando chamada duplicada");
      return;
    }
    
    const today = new Date().toISOString().split("T")[0];
    const devotionalDate = devotional?.date;
    
    // Se não há devocional ou o devocional não é de hoje, busca da API
    // IMPORTANTE: O backend agora verifica se já existe tradução/resumo antes de chamar IA
    if (!devotional || (devotionalDate && devotionalDate !== today)) {
      fetchingRef.current = true;
      
      try {
        console.log("Buscando devocional do dia (backend verificará se precisa chamar IA)");
        const result = await fetchManual({});
        if (result?.success) {
          // Sucesso silencioso - o useQuery vai atualizar automaticamente
          console.log("Verso do dia atualizado automaticamente");
        } else {
          console.warn("Erro ao buscar devocional automaticamente:", result?.error);
        }
      } catch (error) {
        console.warn("Erro ao buscar devocional automaticamente:", error);
      } finally {
        fetchingRef.current = false;
      }
    } else {
      // Devocional de hoje já existe, não precisa buscar
      console.log("Devocional de hoje já existe, não precisa buscar");
    }
  }, [devotional, fetchManual]);

  // Ref para rastrear o último refreshKey processado
  const lastProcessedRefreshKey = useRef(0);
  
  // Verifica e busca quando detecta mudança de dia OU quando devotional é carregado
  // Consolidado em um único useEffect para evitar chamadas duplicadas
  useEffect(() => {
    // Só executa se não estiver carregando
    if (isLoading) return;
    
    const today = new Date().toISOString().split("T")[0];
    const devotionalDate = devotional?.date;
    
    // Se não há devocional, tenta buscar
    if (!devotional) {
      checkAndFetchIfNeeded();
      return;
    }
    
    // Verifica se refreshKey mudou (mudança de dia detectada)
    const refreshKeyChanged = refreshKey !== lastProcessedRefreshKey.current;
    if (refreshKeyChanged) {
      lastProcessedRefreshKey.current = refreshKey;
    }
    
    // Só busca se:
    // 1. O devocional não é de hoje, OU
    // 2. O refreshKey mudou (mudança de dia detectada)
    if ((devotionalDate && devotionalDate !== today) || refreshKeyChanged) {
      checkAndFetchIfNeeded();
    }
  }, [refreshKey, isLoading, devotional?.date, checkAndFetchIfNeeded]);

  const isSaved = useQuery(
    api.dailyStudy.isDevotionalSaved,
    devotional ? { devotionalId: devotional._id } : "skip"
);

const isSaving = isSaved === undefined;
const [isActionLoading, setIsActionLoading] = useState(false);

  const backgroundImageUrl =
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";


    const handleSave = async () => {
      if (!devotional) return;
  
      setIsActionLoading(true);
      try {
        if (isSaved) {
          // Remover dos salvos
          await unsaveDevotional({ devotionalId: devotional._id });
          Toast.show({
            type: 'success',
            text1: t('common.success'),
            text2: t('verseOfDay.unsavedSuccess'),
          });
        } else {
          // Salvar
          await saveDevotional({ devotionalId: devotional._id });
          Toast.show({
            type: 'success',
            text1: t('common.success'),
            text2: t('verseOfDay.savedSuccess'),
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: error instanceof Error
            ? error.message
            : t('verseOfDay.saveError'),
        });
      } finally {
        setIsActionLoading(false);
      }
    };
    const handleShare = async () => {
		if (!devotional) return;

		try {
			const reference = devotional.reference || devotional.rawData?.ref || "";
			const verse = devotional.verse || devotional.rawData?.text || "";
			
			const shareText = reference
				? `${reference}\n\n"${verse}"`
				: `"${verse}"`;

			const result = await Share.share({
				message: shareText,
				title: reference || t('verseOfDay.title'),
			});

			if (result.action === Share.sharedAction) {
				// Opcional: mostrar feedback de sucesso
			}
		} catch (error) {
            Toast.show({
				type: 'error',
				text1: t('common.error'),
				text2: error instanceof Error
					? error.message
					: t('verseOfDay.shareError'),
			});
		}
	};


  return (
    <ImageBackground
      source={{ uri: backgroundImageUrl }}
      className="w-full h-96 rounded-[10px] overflow-hidden"
      imageStyle={{
        borderRadius: 20,
      }}
      resizeMode="cover"
    >
<View className="flex-1 bg-black/50 justify-between">
        <View className="rounded-md flex-column justify-start items-start p-4">
          <Text className={`text-white mb-1 font-semibold`}>
            {t('verseOfDay.title')}
          </Text>
          <Text className="text-white/80 text-lg font-bold">
            {devotional?.reference}
          </Text>
        </View>
        <View className="justify-start items-start flex-1 px-4">
          {(devotional?.verse || devotional?.rawData?.text) && (
            <View className="mb-6">
              <Text className="text-2xl text-white leading-relaxed text-left italic">
                {`${devotional?.verse || devotional?.rawData?.text}`}
</Text>
            </View>
        )}
        </View>
        
        <View className="flex-row justify-end items-center gap-3 p-4">
          <Pressable 
            onPress={handleSave}
            disabled={isSaving || isLoading}
            style={{ opacity: (isSaving || isLoading) ? 0.5 : 1 }}
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
                {isActionLoading ? 
                  <Spinner size="md" color="white" /> :     
                  <Heart size={24} color="white" fill={isSaved ? "white" : "transparent"} />
                }
              </GlassView>
            ) : (
              <View 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: cardColor,
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
                {isActionLoading ? 
                  <Spinner size="md" color="white" /> :     
                  <Heart size={24} color="white" fill={isSaved ? "white" : "transparent"} />
                }
              </View>
            )}
          </Pressable>
          
          <Pressable 
            onPress={handleShare}
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
                <Share2 size={24} color="white" />
              </GlassView>
            ) : (
              <View 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: cardColor,
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
                <Share2 size={24} color="white" />
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}