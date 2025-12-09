import { View, Text, ScrollView, Pressable, Animated, Platform } from "react-native";
import { useThemeColor } from "heroui-native";
import { ScrollShadow } from "heroui-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useRef, useEffect } from "react";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { useQuery } from "convex/react";
import { useAppSettings } from "@/contexts/app-settings-context";
import { api } from "@teste-final-bible/backend/convex/_generated/api";

export default function VerseDetails() {
    const backgroundColor = useThemeColor("background");
    const foregroundColor = useThemeColor("foreground");
    const primaryColor = useThemeColor("primary" as any);
    const backgroundSecondaryColor = useThemeColor("backgroundSecondary" as any);
    const [activeTab, setActiveTab] = useState("explanation");
    
   
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const getTabIndex = (tab: string) => {
        switch(tab) {
            case "explanation": return 0;
            case "related": return 1;
            default: return 0;
        }
    };

    const { language } = useAppSettings();
    const [refreshing, setRefreshing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const previousDevotionalRef = useRef<any>(null);
    
    const devotional = useQuery(
        api.dailyStudy.getTodayDevotional, 
        { language, _refreshKey: refreshKey }
    );

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
        { value: "explanation", label: "Explanation" },
        { value: "related", label: "Related Verses" },
    ];

    return (
        <View className="flex-1" style={{ backgroundColor }}>
            {/* Botão de voltar flutuante */}
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
                        <ArrowLeft size={24} color={foregroundColor} />
                    </GlassView>
                ) : (
                    <View 
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: backgroundSecondaryColor,
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
                        <ArrowLeft size={24} color={foregroundColor} />
                    </View>
                )}
            </Pressable>

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
                    {/* Versículo do Dia */}
                    <View className="px-6 mb-6">
                        <View className="bg-primary/20 rounded-2xl p-6 border border-primary/30">
                            <Text 
                                className="text-primary text-sm font-semibold mb-2"
                                style={{ color: primaryColor }}
                            >
                                Verse of Day
                            </Text>
                            <Text className="text-foreground text-2xl font-bold mb-4">
                                {devotional?.reference}
                            </Text>
                            <Text className="text-foreground/90 text-lg leading-relaxed italic">
                                {devotional?.verse}
                            </Text>
                        </View>
                    </View>

                    {/* Tabs Customizadas */}
                    <View className="px-6 mb-6">
                        <View 
                            className="flex-row rounded-full p-1 relative"
                            style={{ 
                                backgroundColor: 'rgba(128, 128, 128, 0.15)',
                            }}
                        >
                            {tabs.map((tab, index) => {
                                const isActive = activeTab === tab.value;
                                const scaleAnimTab = useRef(new Animated.Value(1)).current;
                                
                                const handlePressIn = () => {
                                    Animated.spring(scaleAnimTab, {
                                        toValue: 0.95,
                                        useNativeDriver: true,
                                    }).start();
                                };
                                
                                const handlePressOut = () => {
                                    Animated.spring(scaleAnimTab, {
                                        toValue: 1,
                                        friction: 3,
                                        tension: 40,
                                        useNativeDriver: true,
                                    }).start();
                                };
                                
                                return (
                                    <Animated.View 
                                        key={tab.value}
                                        className="flex-1"
                                        style={{
                                            transform: [{ scale: scaleAnimTab }]
                                        }}
                                    >
                                        <Pressable
                                            onPress={() => setActiveTab(tab.value)}
                                            onPressIn={handlePressIn}
                                            onPressOut={handlePressOut}
                                            className="py-3 px-4 rounded-full items-center justify-center"
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
                                    </Animated.View>
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
                        {activeTab === "explanation" && (
                            <View className="mb-6">
                                <Text 
                                    className="text-primary text-lg font-semibold mb-4"
                                    style={{ color: primaryColor, alignSelf: "flex-start" }}
                                >
                                    Description
                                </Text>
                                <View 
                                    className="bg-primary/30"
                                    style={{
                                        height: 3,
                                        borderRadius: 2,
                                        marginTop: -6,
                                        marginBottom: 32, 
                                        width: 64 
                                    }}
                                />
                                
                                <Text className="text-foreground text-base leading-relaxed mb-4">
                                    {devotional?.summary}
                                </Text>
                                
                            </View>
                        )}

                        {activeTab === "related" && (
                            <View className="mb-6">
                                <Text 
                                    className="text-primary text-lg font-semibold mb-4"
                                    style={{ color: primaryColor }}
                                >
                                    Related Verses
                                </Text>
                                <View 
                                    className="bg-primary/30"
                                    style={{
                                        height: 3,
                                        borderRadius: 2,
                                        marginTop: -6,
                                        marginBottom: 32, 
                                        width: 64 
                                    }}
                                />
                                
                                {devotional?.relatedVerses && devotional.relatedVerses.length > 0 ? (
                                    devotional.relatedVerses.map((relatedVerse: { reference: string; text: string }, index: number) => (
                                        <View 
                                            key={index}
                                            className="bg-popover/50 rounded-xl p-4 mb-4 border border-border"
                                        >
                                            <Text className="text-foreground font-semibold text-lg mb-2">
                                                {relatedVerse.reference}
                                            </Text>
                                            <Text className="text-foreground/90 text-base leading-relaxed italic">
                                                "{relatedVerse.text}"
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <View className="bg-popover/50 rounded-xl p-4 border border-border">
                                        <Text className="text-foreground/60 text-base text-center italic">
                                            Nenhum versículo relacionado disponível no momento.
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