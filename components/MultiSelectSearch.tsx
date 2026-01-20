import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { searchMovies, searchMusicArtists, searchFoodTypes, searchFashionStyles, type SearchResult } from '@/lib/search';

export type InterestCategory = 'food' | 'music_artists' | 'movies' | 'fashion';

interface MultiSelectSearchProps {
  category: InterestCategory;
  selectedItems: SearchResult[];
  onSelectionChange: (items: SearchResult[]) => void;
  maxSelections?: number; // For food: 5, others: unlimited
  placeholder?: string;
}

export function MultiSelectSearch({
  category,
  selectedItems,
  onSelectionChange,
  maxSelections,
  placeholder,
}: MultiSelectSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);

  // Load default options on mount
  useEffect(() => {
    loadDefaultOptions();
  }, [category]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (searchQuery.trim().length < 2) {
      // Show default options when search is empty
      loadDefaultOptions();
      return;
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 300);

    setDebounceTimer(timer);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [searchQuery]);

  async function loadDefaultOptions() {
    setIsSearching(true);
    try {
      let results: SearchResult[] = [];
      
      switch (category) {
        case 'movies':
          // Show popular movies (search with empty string returns popular)
          results = await searchMovies('', 20);
          break;
        case 'music_artists':
          // Show popular artists
          results = await searchMusicArtists('', 20);
          break;
        case 'food':
          // Show all food types (no search query returns all)
          results = searchFoodTypes('', 30);
          break;
        case 'fashion':
          // Show all fashion styles
          results = searchFashionStyles('', 30);
          break;
        default:
          results = [];
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Error loading default options:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function performSearch(query: string) {
    setIsSearching(true);
    try {
      let results: SearchResult[] = [];
      
      switch (category) {
        case 'movies':
          results = await searchMovies(query);
          break;
        case 'music_artists':
          results = await searchMusicArtists(query);
          break;
        case 'food':
          results = searchFoodTypes(query);
          break;
        case 'fashion':
          results = searchFashionStyles(query);
          break;
        default:
          results = [];
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function isSelected(item: SearchResult): boolean {
    return selectedItems.some(selected => selected.id === item.id);
  }

  function handleToggleItem(item: SearchResult) {
    if (isSelected(item)) {
      // Remove item
      const newSelection = selectedItems.filter(selected => selected.id !== item.id);
      onSelectionChange(newSelection);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Add item (check max selections)
      if (maxSelections && selectedItems.length >= maxSelections) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      const newSelection = [...selectedItems, item];
      onSelectionChange(newSelection);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  function handleRemoveSelected(item: SearchResult) {
    const newSelection = selectedItems.filter(selected => selected.id !== item.id);
    onSelectionChange(newSelection);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const defaultPlaceholder = `Search ${category === 'food' ? 'food types' : category === 'music_artists' ? 'music artists' : category === 'movies' ? 'movies' : 'fashion styles'}...`;

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <BlurView intensity={80} tint="dark" style={styles.searchInputWrapper}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.glassHighlight}
            pointerEvents="none"
          />
          <View style={styles.searchInputInner}>
            <Search size={20} color="rgba(255, 255, 255, 0.6)" />
            <TextInput
              style={styles.searchInput}
              placeholder={placeholder || defaultPlaceholder}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && (
              <ActivityIndicator size="small" color="rgba(135, 206, 250, 0.9)" />
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  loadDefaultOptions();
                }}
                style={styles.clearButton}
              >
                <X size={18} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </View>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>
            Selected {maxSelections && `(${selectedItems.length}/${maxSelections})`}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedScroll}
          >
            {selectedItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.selectedChip}
                onPress={() => handleRemoveSelected(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectedChipText} numberOfLines={1}>
                  {item.name}
                </Text>
                <X size={14} color="rgba(255, 255, 255, 0.8)" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Options List (Default or Search Results) */}
      {searchResults.length > 0 ? (
        <ScrollView
          style={styles.resultsContainer}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {searchQuery.length === 0 && (
            <Text style={styles.sectionLabel}>Popular Options</Text>
          )}
          {searchResults.map((item) => {
            const selected = isSelected(item);
            const isMaxReached = !!(maxSelections && selectedItems.length >= maxSelections && !selected);
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.resultItem,
                  selected && styles.resultItemSelected,
                  isMaxReached ? styles.resultItemDisabled : undefined,
                ]}
                onPress={() => handleToggleItem(item)}
                disabled={isMaxReached}
                activeOpacity={0.7}
              >
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.resultImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.resultContent}>
                  <Text style={[styles.resultName, selected && styles.resultNameSelected]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.description && (
                    <Text style={styles.resultDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
                {selected && (
                  <View style={styles.checkmark}>
                    <Check size={18} color="rgba(135, 206, 250, 0.9)" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : !isSearching && searchQuery.length >= 2 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No results found</Text>
          <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputWrapper: {
    borderRadius: 16,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  searchInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  selectedContainer: {
    marginBottom: 16,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  selectedScroll: {
    gap: 8,
    paddingRight: 24,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
  },
  selectedChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    maxWidth: 150,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    gap: 12,
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.2)',
    gap: 12,
  },
  resultItemSelected: {
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    borderColor: 'rgba(135, 206, 250, 0.5)',
  },
  resultItemDisabled: {
    opacity: 0.5,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resultNameSelected: {
    color: 'rgba(135, 206, 250, 0.9)',
  },
  resultDescription: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.7)',
    lineHeight: 18,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.5)',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    marginTop: 4,
  },
});

