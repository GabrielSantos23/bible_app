import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Share,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, cn, ScrollShadow, Select, useThemeColor, Card, Spinner } from 'heroui-native';
import { Search, BookOpen, Heart, Share2 } from 'lucide-react-native';
import { Easing } from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';
import {
  KeyboardAvoidingView,
  KeyboardController,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useAppSettings } from '@/contexts/app-settings-context';
import { SelectBlurBackdrop } from '@/components/select-blur-backdrop';
import { GlassView } from 'expo-glass-effect';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@teste-final-bible/backend/convex/_generated/api';
import Toast from 'react-native-toast-message';

KeyboardController.preload();

type LanguageOption = {
  value: 'pt' | 'en';
  label: string;
  flag: string;
};

const LANGUAGES: LanguageOption[] = [
	{ value: 'pt', label: 'Português', flag: '🇧🇷' },
	{ value: 'en', label: 'English', flag: '🇺🇸' },
];

type SearchResultItem = {
	id?: string;
	reference?: string;
	text?: string;
	human?: string;
	osis?: string;
	content?: string;
	[key: string]: any;
};

type SearchResponse = {
	query: string;
	language: 'pt' | 'en';
	results: SearchResultItem[];
	cursor: number;
	total?: number;
	fromCache: number;
	fromApi: number;
	hasMore: boolean;
};

const HEADER_MAX_HEIGHT = 180;
const HEADER_MIN_HEIGHT = 125;
const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Helper function to strip HTML tags and extract clean text
function stripHtml(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags (including self-closing tags and attributes)
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
  
  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Helper function to extract reference from HTML or item data
function extractReference(item: SearchResultItem): string {
  // Try direct reference fields first
  if (item.reference) return item.reference;
  if (item.human) return item.human;
  if (item.osis) return item.osis;
  
  // Try to extract from HTML content (data-sid attribute)
  const content = item.text ?? item.content ?? '';
  if (typeof content === 'string' && content.includes('data-sid=')) {
    const match = content.match(/data-sid="([^"]+)"/);
    if (match && match[1]) {
      // Format: "MAT 22:22" - convert to more readable format if needed
      const ref = match[1];
      // You can add book name mapping here if needed
      // For now, return as is since it's already readable
      return ref;
    }
  }
  
  // Try to extract from other fields
  if (item.verseId) return item.verseId;
  if (item.id) return item.id;
  
  // Try to extract from passageId or similar fields
  if ((item as any).passageId) return (item as any).passageId;
  if ((item as any).bibleId) return (item as any).bibleId;
  
  return '';
}

// Helper function to extract clean text from item
function extractText(item: SearchResultItem): string {
  const content = item.text ?? item.content ?? '';
  
  if (typeof content === 'string') {
    // If it contains HTML, strip it
    if (content.includes('<') && content.includes('>')) {
      let cleanText = stripHtml(content);
      
      // Remove verse numbers that might appear at the start
      // This handles multiple patterns:
      // - "22 " (number with space)
      // - "22Quando" (number directly before text)
      // - "22Quando" (number with capital letter)
      // - "22 quando" (number with lowercase)
      cleanText = cleanText
        // Remove number at start with optional space
        .replace(/^\d+\s+/, '')
        // Remove number directly before text (handles "22Quando")
        .replace(/^(\d+)([A-Za-zÀ-ÿ])/, '$2')
        // Remove any remaining leading numbers
        .replace(/^\d+/, '');
      
      return cleanText.trim();
    }
    
    // Even if not HTML, check for leading verse numbers
    let text = content;
    text = text
      .replace(/^\d+\s+/, '')
      .replace(/^(\d+)([A-Za-zÀ-ÿ])/, '$2')
      .replace(/^\d+/, '');
    
    return text.trim();
  }
  
  return '';
}

// Helper function to create a unique key for an item
function getItemKey(item: SearchResultItem, index: number): string {
  const reference = extractReference(item);
  const text = extractText(item);
  // Use reference + first 50 chars of text as key, or fallback to index
  if (reference && text) {
    return `${reference}-${text.substring(0, 50)}`;
  }
  if (item.id) return item.id;
  return `item-${index}`;
}

// Helper function to create a key for duplicate detection (without index)
function getItemKeyForDedup(item: SearchResultItem): string {
  const reference = extractReference(item);
  const text = extractText(item);
  // Use reference + first 100 chars of text as key for better uniqueness
  if (reference && text) {
    return `${reference}-${text.substring(0, 100)}`;
  }
  // Try to use raw content as fallback
  const rawContent = item.text ?? item.content ?? '';
  if (rawContent) {
    return String(rawContent).substring(0, 100);
  }
  if (item.id) return item.id;
  // Last resort: use a hash of the object
  return JSON.stringify(item).substring(0, 100);
}

// Helper function to remove duplicate results
function removeDuplicates(items: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  const unique: SearchResultItem[] = [];
  
  for (const item of items) {
    const key = getItemKeyForDedup(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  
  return unique;
}

// Component for individual search result card with save and share buttons
function SearchResultCard({ item, language }: { item: SearchResultItem; language: 'pt' | 'en' }) {
  const reference = extractReference(item);
  const text = extractText(item);
  const { isDark } = useAppTheme();
  const cardColor = useThemeColor('card' as any);
  
  const isSaved = useQuery(
    api.dailyStudy.isVerseSaved,
    reference && text ? { reference, text } : 'skip'
  );
  
  const saveVerse = useMutation(api.dailyStudy.saveVerse);
  const unsaveVerse = useMutation(api.dailyStudy.unsaveVerse);
  
  const isSaving = isSaved === undefined;
  
  const handleSave = async () => {
    if (!reference || !text) return;
    
    try {
      if (isSaved) {
        await unsaveVerse({ reference, text });
        Toast.show({
          type: 'success',
          text1: language === 'pt' ? 'Sucesso' : 'Success',
          text2: language === 'pt' 
            ? 'Versículo removido dos favoritos com sucesso!'
            : 'Verse removed from favorites successfully!',
        });
      } else {
        await saveVerse({ 
          reference, 
          text, 
          language,
          rawData: item,
        });
        Toast.show({
          type: 'success',
          text1: language === 'pt' ? 'Sucesso' : 'Success',
          text2: language === 'pt'
            ? 'Versículo salvo nos favoritos com sucesso!'
            : 'Verse saved to favorites successfully!',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: language === 'pt' ? 'Erro' : 'Error',
        text2: error instanceof Error
          ? error.message
          : language === 'pt'
            ? 'Erro ao salvar/remover versículo'
            : 'Error saving/removing verse',
      });
    }
  };
  
  const handleShare = async () => {
    if (!reference || !text) return;
    
    try {
      const shareText = `${reference}\n\n"${text}"`;
      
      await Share.share({
        message: shareText,
        title: reference,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: language === 'pt' ? 'Erro' : 'Error',
        text2: error instanceof Error
          ? error.message
          : language === 'pt'
            ? 'Erro ao compartilhar versículo'
            : 'Error sharing verse',
      });
    }
  };
  
  if (!reference && !text) return null;
  
  return (
    <Card variant="secondary" className="mb-3">
      <View className="p-3">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-2">
            {reference ? (
              <Text className="text-xs text-muted mb-1">
                {reference}
              </Text>
            ) : null}
            {text ? (
              <Text className="text-foreground text-sm">{text}</Text>
            ) : null}
          </View>
        </View>
        
        <View className="flex-row justify-end items-center gap-3 mt-2">
          <Pressable 
            onPress={handleSave}
            disabled={isSaving}
            style={{ opacity: isSaving ? 0.5 : 1 }}
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
                {isSaving ? 
                  <Spinner size="sm" color={isDark ? "white" : "black"} /> :     
                  <Heart size={18} color={isDark ? "white" : "black"} fill={isSaved ? (isDark ? "white" : "black") : "transparent"} />
                }
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
                {isSaving ? 
                  <Spinner size="sm" color={isDark ? "white" : "black"} /> :     
                  <Heart size={18} color={isDark ? "white" : "black"} fill={isSaved ? (isDark ? "white" : "black") : "transparent"} />
                }
              </View>
            )}
          </Pressable>
          
          <Pressable onPress={handleShare}>
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
}

export default function SearchPage() {
  const { language, setLanguage } = useAppSettings();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption | undefined>(
    LANGUAGES.find(l => l.value === language)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollY = useSharedValue(0);
  const { isDark } = useAppTheme();
  const backgroundColor = useThemeColor("background");

  const themeColorMuted = useThemeColor('muted');
  const themeColorForeground = useThemeColor('foreground');
  const themeColorOverlay = useThemeColor('overlay');
  const themeColorSurface = useThemeColor('surface');

  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const insetTop = insets.top + 12;
  const maxDialogHeight = (height - insetTop) / 2;

  const searchBible = useAction(api.bibleSearch.searchBible);

  // Sync selectedLanguage with language from context
  useEffect(() => {
    const lang = LANGUAGES.find(l => l.value === language);
    if (lang) {
      setSelectedLanguage(lang);
    }
  }, [language]);

  const filteredLanguages = LANGUAGES.filter((lang) =>
    lang.label.toLowerCase().includes(languageSearchQuery.toLowerCase())
  );

  const handleSearchWithQuery = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLastQuery('');
      setHasMore(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResults([]);
      setCursor(0);
      setHasMore(false);
      setLastQuery(trimmed);
      Keyboard.dismiss();

      const response = (await searchBible({
        query: trimmed,
        language,
        cursor: 0,
        pageSize: 20,
      })) as SearchResponse;

      // Remove duplicates before setting results
      const uniqueResults = removeDuplicates(response.results);
      setResults(uniqueResults);
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (e: any) {
      console.error('Erro ao buscar versículos:', e);
      setError(
        e?.message ??
          'Ocorreu um erro ao buscar. Tente novamente mais tarde.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchBible, language]);

  // Handle search when user presses search button on keyboard
  const handleSearch = useCallback(() => {
    if (searchQuery.trim().length > 0) {
      handleSearchWithQuery(searchQuery);
    }
  }, [searchQuery, handleSearchWithQuery]);

  const handleLoadMore = useCallback(async () => {
    // Don't load more if already loading, no more results, or no query
    if (isLoadingMore || !hasMore || !lastQuery || isLoading) return;

    try {
      setIsLoadingMore(true);
      setError(null);

      const response = (await searchBible({
        query: lastQuery,
        language,
        cursor,
        pageSize: 20,
      })) as SearchResponse;

      // Remove duplicates from new results and existing results
      setResults((prev) => {
        const allResults = prev.concat(response.results);
        return removeDuplicates(allResults);
      });
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (e: any) {
      console.error('Erro ao carregar mais resultados:', e);
      setError(
        e?.message ??
          'Ocorreu um erro ao carregar mais resultados.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, lastQuery, searchBible, language, cursor]);

  const renderItem = useCallback(({ item }: { item: SearchResultItem }) => {
    return <SearchResultCard item={item} language={language} />;
  }, [language]);


  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
      },
    },
    []
  );

  const headerStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        scrollY.value,
        [0, SCROLL_DISTANCE],
        [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        Extrapolation.CLAMP
      ),
    };
  });

  const topContentStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, SCROLL_DISTANCE * 0.5],
        [1, 0],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, SCROLL_DISTANCE],
            [0, -40],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const inputStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, SCROLL_DISTANCE],
            [0, -56],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  return (
    <View className="flex-1 " style={{backgroundColor}}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {isLoading && results.length === 0 ? (
        <ScrollShadow
          LinearGradientComponent={LinearGradient}
          className="flex-1"
          size={60}
        >
          <View className="flex-1 items-center justify-center" style={{ paddingTop: HEADER_MAX_HEIGHT + 20 }}>
            <ActivityIndicator size="large" />
            <Text className="text-muted mt-4">Buscando versículos...</Text>
          </View>
        </ScrollShadow>
      ) : results.length > 0 ? (
          <Animated.FlatList
            data={results}
            keyExtractor={(item, index) => getItemKey(item, index)}
            renderItem={renderItem}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{
              paddingTop: HEADER_MAX_HEIGHT + 20,
              paddingHorizontal: 16,
              paddingBottom: 40,
            }}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            showsVerticalScrollIndicator={true}
            ListFooterComponent={
              isLoadingMore && hasMore ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" />
                </View>
              ) : null
            }
            ListEmptyComponent={
              !isLoading && lastQuery !== '' ? (
                <View className="flex-1 items-center justify-center py-20">
                  <Text className="text-muted text-sm text-center px-6">
                    Não encontramos resultados para &quot;{lastQuery}&quot;. Tente usar outro termo ou uma referência diferente.
                  </Text>
                </View>
              ) : null
            }
          />
      ) : (
        <ScrollShadow
          LinearGradientComponent={LinearGradient}
          className="flex-1"
          size={60}
        >
          <Animated.ScrollView
            contentContainerStyle={{
              paddingTop: HEADER_MAX_HEIGHT + 20,
              paddingHorizontal: 16,
              paddingBottom: 40,
            }}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
          >
            {error ? (
              <Card variant="secondary" className="mb-3 border border-danger/40">
                <View className="p-3">
                  <Text className="text-danger text-sm">{error}</Text>
                </View>
              </Card>
            ) : (
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-muted text-sm text-center px-6">
                  Digite uma palavra, frase ou referência para pesquisar versículos.
                </Text>
              </View>
            )}
          </Animated.ScrollView>
        </ScrollShadow>
      )}

      {/* --- ANIMATED HEADER --- */}
      <Animated.View
        style={headerStyle}
        className={cn(
          "absolute top-0 left-0 right-0 z-20  overflow-hidden pt-16 px-4 rounded-b-3xl border-border border",
          Platform.OS === 'android' && "bg-neutral-950 border-b border-neutral-900"
        )}
      >
        {Platform.OS === 'ios' && (
          <GlassView
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            glassEffectStyle="clear"
          />
        )}
        <Animated.View
          style={topContentStyle}
          className="flex-row justify-between items-center mb-4 h-10"
        >
          <View className="flex-row items-center gap-2">
            <BookOpen color="#ffffff" size={24} />
            <Text className="text-foreground text-3xl font-bold tracking-tight">
              Bible Search
            </Text>
          </View>

          {/* --- LANGUAGE SELECT COMPONENT --- */}
          <Select
            value={selectedLanguage}
            onValueChange={(newValue) => {
              const lang = LANGUAGES.find((l) => l.value === newValue?.value);
              if (lang) {
                setSelectedLanguage(lang);
                setLanguage(lang.value);
                setLanguageSearchQuery('');
              }
            }}
            closeDelay={300}
          >
            <Select.Trigger asChild>
              <Button variant="tertiary" size="sm">
                {selectedLanguage ? (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base">{selectedLanguage.flag}</Text>
                  </View>
                ) : (
                  <Text className="text-accent">Select Language</Text>
                )}
              </Button>
            </Select.Trigger>
            
            <Select.Portal
              progressAnimationConfigs={{
                onClose: {
                  animationType: 'timing',
                  animationConfig: {
                    duration: 250,
                    easing: Easing.out(Easing.quad),
                  },
                },
              }}
            >
              <Select.Overlay className="bg-transparent" isDefaultAnimationDisabled>
                <SelectBlurBackdrop />
              </Select.Overlay>
              
              <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={24}>
                <Select.Content
                  classNames={{
                    wrapper: 'justify-center',
                    content: cn('gap-2 rounded-3xl', isDark && 'bg-surface'),
                  }}
                  style={{ marginTop: insetTop, height: maxDialogHeight }}
                  presentation="dialog"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Select.ListLabel>Language</Select.ListLabel>
                    <Select.Close />
                  </View>
                  
                  <View className="w-full mb-2">
                    <TextInput
                      value={languageSearchQuery}
                      onChangeText={setLanguageSearchQuery}
                      placeholder="Search language..."
                      placeholderTextColor={themeColorMuted}
                      className="p-3 rounded-xl bg-surface-secondary/80 text-foreground"
                      autoFocus
                    />
                  </View>
                  
                  <ScrollShadow
                    className="flex-1"
                    LinearGradientComponent={LinearGradient}
                    color={isDark ? themeColorSurface : themeColorOverlay}
                  >
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {filteredLanguages.map((lang) => (
                        <Select.Item
                          key={lang.value}
                          value={lang.value}
                          label={lang.label}
                        >
                          <View className="flex-row items-center gap-3 flex-1">
                            <Text className="text-2xl">{lang.flag}</Text>
                            <Text className="text-base text-foreground flex-1">
                              {lang.label}
                            </Text>
                          </View>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                      {filteredLanguages.length === 0 && (
                        <Text className="text-muted text-center mt-8">
                          No languages found
                        </Text>
                      )}
                    </ScrollView>
                  </ScrollShadow>
                </Select.Content>
              </KeyboardAvoidingView>
            </Select.Portal>
          </Select>

        </Animated.View>

        <Animated.View style={inputStyle} className="w-full">
          <View className={cn(
            "flex-row items-center rounded-xl px-3 py-3 h-12 relative overflow-hidden border border-muted/20",
            Platform.OS === 'android' && "bg-neutral-800"
          )}>
            {Platform.OS === 'ios' && (
              <GlassView
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                glassEffectStyle="clear"
              />
            )}
            <Search color="#a3a3a3" size={20} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Ex.: amor, João 3:16..."
              placeholderTextColor="#a3a3a3"
              className="flex-1 ml-3 text-foreground text-base font-medium p-0"
              clearButtonMode="while-editing"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              style={{
                color: themeColorForeground,
              }}
            />
          </View>
        </Animated.View>
      </Animated.View>
	  
    </View>
  );
}