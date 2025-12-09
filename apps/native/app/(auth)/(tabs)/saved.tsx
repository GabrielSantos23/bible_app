import { View, Text, ScrollView, Pressable, Animated, Platform, Share } from "react-native";
import { useThemeColor, Card, Spinner } from "heroui-native";
import { ScrollShadow } from "heroui-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useRef, useEffect } from "react";
import { router } from "expo-router";
import { ArrowLeft, Heart, Share2 } from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { useQuery, useMutation } from "convex/react";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useAppTheme } from "@/contexts/app-theme-context";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

export default function SavedVerses() {
    const { t } = useTranslation();
    const backgroundColor = useThemeColor("background");
    const foregroundColor = useThemeColor("foreground");
    const primaryColor = useThemeColor("primary" as any);
    const backgroundSecondaryColor = useThemeColor("backgroundSecondary" as any);
    const cardColor = useThemeColor("card" as any);
    const { language } = useAppSettings();
    const { isDark } = useAppTheme();
    const [activeTab, setActiveTab] = useState("devotionals");
    
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const getTabIndex = (tab: string) => {
        switch(tab) {
            case "devotionals": return 0;
            case "verses": return 1;
            default: return 0;
        }
    };

    // Buscar devocionais salvos
    const savedDevotionals = useQuery(api.dailyStudy.getSavedDevotionals);
    
    // Buscar versículos salvos
    const savedVerses = useQuery(api.dailyStudy.getSavedVerses);

    const unsaveDevotional = useMutation(api.dailyStudy.unsaveDevotional);
    const unsaveVerse = useMutation(api.dailyStudy.unsaveVerse);

    useEffect(() => {
        const tabIndex = getTabIndex(activeTab);
        
        // Anima a troca de tab com slide horizontal
        Animated.sequence([
            // Fade out e scale down
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.95,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]),
            // Slide
            Animated.timing(slideAnim, {
                toValue: tabIndex,
                duration: 0,
                useNativeDriver: true,
            }),
            // Fade in e scale up
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ])
        ]).start();
    }, [activeTab]);

    const tabs = [
        { 
            value: "devotionals", 
            label: t('saved.dailyVerses')
        },
        { 
            value: "verses", 
            label: t('saved.searchVerses')
        },
    ];

    const handleUnsaveDevotional = async (devotionalId: any) => {
        try {
            await unsaveDevotional({ devotionalId });
            Toast.show({
                type: 'success',
                text1: t('common.success'),
                text2: t('saved.removedSuccess'),
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: t('common.error'),
                text2: error instanceof Error
                    ? error.message
                    : t('saved.removeError'),
            });
        }
    };

    const handleUnsaveVerse = async (reference: string, text: string) => {
        try {
            await unsaveVerse({ reference, text });
            Toast.show({
                type: 'success',
                text1: t('common.success'),
                text2: t('saved.verseRemovedSuccess'),
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: t('common.error'),
                text2: error instanceof Error
                    ? error.message
                    : t('saved.verseRemoveError'),
            });
        }
    };

    const handleShare = async (reference: string, text: string) => {
        try {
            const shareText = `${reference}\n\n"${text}"`;
            
            await Share.share({
                message: shareText,
                title: reference,
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: t('common.error'),
                text2: error instanceof Error
                    ? error.message
                    : t('saved.shareError'),
            });
        }
    };

    const isLoading = savedDevotionals === undefined || savedVerses === undefined;

    return (
        <View className="flex-1" style={{ backgroundColor }}>
       

            {/* ScrollShadow envolvendo o ScrollView */}
            <ScrollShadow 
                LinearGradientComponent={LinearGradient}
                size={80}
                color={backgroundColor}
                className="flex-1"
            >
                <ScrollView 
                    className="flex-1"
                    contentContainerStyle={{
                        paddingTop: 128,
                        paddingBottom: 40,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Título */}
                    <View className="px-6 mb-6">
                        <Text 
                            className="text-3xl font-bold mb-2"
                            style={{ color: foregroundColor }}
                        >
                            {t('saved.title')}
                        </Text>
                        <Text 
                            className="text-base opacity-60"
                            style={{ color: foregroundColor }}
                        >
                            {t('saved.subtitle')}
                        </Text>
                    </View>

                    {/* Tabs Customizadas */}
                    <View className="px-6 mb-6">
                        <View 
                            className="flex-row rounded-full p-1 relative"
                            style={{ 
                                backgroundColor: 'rgba(128, 128, 128, 0.15)',
                            }}
                        >
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.value;
                                
                                return (
                                    <Pressable
                                        key={tab.value}
                                        onPress={() => setActiveTab(tab.value)}
                                        className="flex-1 py-3 px-4 rounded-full items-center justify-center"
                                        style={{
                                            backgroundColor: isActive 
                                                ? 'rgba(100, 100, 100, 0.8)' 
                                                : 'transparent',
                                        }}
                                    >
                                        <Text 
                                            className="text-sm font-semibold"
                                            style={{ 
                                                color: isActive ? '#ffffff' : foregroundColor,
                                                opacity: isActive ? 1 : 0.6,
                                            }}
                                        >
                                            {tab.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Tab Content com animação */}
                    <View className="px-6">
                        <Animated.View 
                            style={{
                                opacity: fadeAnim,
                                transform: [
                                    {
                                        scale: scaleAnim
                                    }
                                ]
                            }}
                        >
                            {isLoading ? (
                                <View className="items-center justify-center py-20">
                                    <Spinner size="lg" />
                                </View>
                            ) : activeTab === "devotionals" ? (
                                <View className="mb-6">
                                    {savedDevotionals && savedDevotionals.length > 0 ? (
                                        savedDevotionals.map((devotional: any) => {
                                            if (!devotional || !devotional._id) return null;
                                            
                                            return (
                                                <Card key={devotional._id} variant="secondary" className="mb-4">
                                                    <View className="p-4">
                                                        <View className="flex-row justify-between items-start mb-3">
                                                            <View className="flex-1 mr-2">
                                                                <Text 
                                                                    className="text-primary text-sm font-semibold mb-2"
                                                                    style={{ color: primaryColor }}
                                                                >
                                                                    {t('verseOfDay.title')}
                                                                </Text>
                                                                <Text className="text-foreground text-xl font-bold mb-2">
                                                                    {devotional.reference || devotional.rawData?.ref || ''}
                                                                </Text>
                                                                <Text className="text-foreground/90 text-base leading-relaxed italic">
                                                                    {devotional.verse || devotional.rawData?.text || ''}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        
                                                        <View className="flex-row justify-end items-center gap-3 mt-3">
                                                            <Pressable 
                                                                onPress={() => handleUnsaveDevotional(devotional._id)}
                                                            >
                                                                {Platform.OS === 'ios' ? (
                                                                    <GlassView 
                                                                        style={{
                                                                            width: 36,
                                                                            height: 36,
                                                                            borderRadius: 18,
                                                                            justifyContent: 'center',
                                                                            alignItems: 'center',
                                                                        }}
                                                                        isInteractive
                                                                    >
                                                                        <Heart size={18} color={isDark ? "white" : "black"} fill={isDark ? "white" : "black"} />
                                                                    </GlassView>
                                                                ) : (
                                                                    <View 
                                                                        style={{
                                                                            width: 36,
                                                                            height: 36,
                                                                            borderRadius: 18,
                                                                            justifyContent: 'center',
                                                                            alignItems: 'center',
                                                                            backgroundColor: cardColor,
                                                                            opacity: 0.9,
                                                                        }}
                                                                    >
                                                                        <Heart size={18} color={isDark ? "white" : "black"} fill={isDark ? "white" : "black"} />
                                                                    </View>
                                                                )}
                                                            </Pressable>
                                                            
                                                            <Pressable 
                                                                onPress={() => handleShare(
                                                                    devotional.reference || devotional.rawData?.ref || "",
                                                                    devotional.verse || devotional.rawData?.text || ""
                                                                )}
                                                            >
                                                                {Platform.OS === 'ios' ? (
                                                                    <GlassView 
                                                                        style={{
                                                                            width: 36,
                                                                            height: 36,
                                                                            borderRadius: 18,
                                                                            justifyContent: 'center',
                                                                            alignItems: 'center',
                                                                        }}
                                                                        isInteractive
                                                                    >
                                                                        <Share2 size={18} color={isDark ? "white" : "black"} />
                                                                    </GlassView>
                                                                ) : (
                                                                    <View 
                                                                        style={{
                                                                            width: 36,
                                                                            height: 36,
                                                                            borderRadius: 18,
                                                                            justifyContent: 'center',
                                                                            alignItems: 'center',
                                                                            backgroundColor: cardColor,
                                                                            opacity: 0.9,
                                                                        }}
                                                                    >
                                                                        <Share2 size={18} color={isDark ? "white" : "black"} />
                                                                    </View>
                                                                )}
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                </Card>
                                            );
                                        })
                                    ) : (
                                        <View className="bg-popover/50 rounded-xl p-6 border border-border items-center">
                                            <Text className="text-foreground/60 text-base text-center">
                                                {t('saved.noDailyVerses')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View className="mb-6">
                                    {savedVerses && savedVerses.length > 0 ? (
                                        savedVerses.map((verse: any) => (
                                            <Card key={verse._id} variant="secondary" className="mb-4">
                                                <View className="p-4">
                                                    <View className="flex-row justify-between items-start mb-3">
                                                        <View className="flex-1 mr-2">
                                                            <Text className="text-xs text-muted mb-1">
                                                                {verse.reference}
                                                            </Text>
                                                            <Text className="text-foreground text-base leading-relaxed">
                                                                {verse.text}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    
                                                    <View className="flex-row justify-end items-center gap-3 mt-3">
                                                        <Pressable 
                                                            onPress={() => handleUnsaveVerse(verse.reference, verse.text)}
                                                        >
                                                            {Platform.OS === 'ios' ? (
                                                                <GlassView 
                                                                    style={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: 18,
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center',
                                                                    }}
                                                                    isInteractive
                                                                >
                                                                    <Heart size={18} color={isDark ? "white" : "black"} fill={isDark ? "white" : "black"} />
                                                                </GlassView>
                                                            ) : (
                                                                <View 
                                                                    style={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: 18,
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center',
                                                                        backgroundColor: cardColor,
                                                                        opacity: 0.9,
                                                                    }}
                                                                >
                                                                    <Heart size={18} color={isDark ? "white" : "black"} fill={isDark ? "white" : "black"} />
                                                                </View>
                                                            )}
                                                        </Pressable>
                                                        
                                                        <Pressable 
                                                            onPress={() => handleShare(verse.reference, verse.text)}
                                                        >
                                                            {Platform.OS === 'ios' ? (
                                                                <GlassView 
                                                                    style={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: 18,
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center',
                                                                    }}
                                                                    isInteractive
                                                                >
                                                                    <Share2 size={18} color={isDark ? "white" : "black"} />
                                                                </GlassView>
                                                            ) : (
                                                                <View 
                                                                    style={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: 18,
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center',
                                                                        backgroundColor: cardColor,
                                                                        opacity: 0.9,
                                                                    }}
                                                                >
                                                                    <Share2 size={18} color={isDark ? "white" : "black"} />
                                                                </View>
                                                            )}
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            </Card>
                                        ))
                                    ) : (
                                        <View className="bg-popover/50 rounded-xl p-6 border border-border items-center">
                                            <Text className="text-foreground/60 text-base text-center">
                                                {t('saved.noSearchVerses')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </Animated.View>
                    </View>
                </ScrollView>
            </ScrollShadow>
        </View>
    );
}

