import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { saveUserInterests, getUserInterests, hasCompletedInterestCategory } from '@/lib/storage';
import { MultiSelectSearch, type InterestCategory } from '@/components/MultiSelectSearch';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { SearchResult } from '@/lib/search';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food Types',
  music_artists: 'Music Artists',
  movies: 'Movies',
  fashion: 'Fashion',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  food: 'Select 5 of your favorite types of food',
  music_artists: 'Select your favorite music artists',
  movies: 'Select your favorite movies',
  fashion: 'Select your favorite fashion styles',
};

export default function CategoryScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const user = useAuth((state) => state.user);
  const [selectedItems, setSelectedItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const categoryKey = category as InterestCategory;
  const maxSelections = categoryKey === 'food' ? 5 : undefined;

  useEffect(() => {
    if (category && user) {
      loadExistingInterests();
    }
  }, [category, user]);

  async function loadExistingInterests() {
    if (!category || !user) return;

    setLoading(true);
    try {
      const completed = await hasCompletedInterestCategory(user.id, category);
      setIsComplete(completed);

      // Load existing selections
      const existing = await getUserInterests(user.id, category);
      const items: SearchResult[] = existing.map(item => ({
        id: item.item_id || item.item_name,
        name: item.item_name,
        imageUrl: item.item_metadata?.imageUrl,
        description: item.item_metadata?.description,
        metadata: item.item_metadata || {},
      }));

      setSelectedItems(items);
    } catch (error) {
      console.error('Error loading interests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user || !category || saving) return;

    // Validate food category requires exactly 5
    if (categoryKey === 'food' && selectedItems.length !== 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Validate other categories require at least 1
    if (categoryKey !== 'food' && selectedItems.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSaving(true);
    try {
      const itemsToSave = selectedItems.map(item => ({
        name: item.name,
        id: item.id,
        metadata: {
          imageUrl: item.imageUrl,
          description: item.description,
          ...item.metadata,
        },
      }));

      await saveUserInterests(user.id, category, itemsToSave);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsComplete(true);
    } catch (error) {
      console.error('Error saving interests:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  function handleSelectionChange(items: SearchResult[]) {
    setSelectedItems(items);
    setIsComplete(false);
  }

  const categoryLabel = category ? CATEGORY_LABELS[category] || category : 'Interests';
  const categoryDescription = category ? CATEGORY_DESCRIPTIONS[category] || '' : '';
  const canSave = categoryKey === 'food' 
    ? selectedItems.length === 5 
    : selectedItems.length > 0;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{categoryLabel}</Text>
              {maxSelections && (
                <Text style={styles.headerSubtitle}>
                  {selectedItems.length}/{maxSelections} selected
                </Text>
              )}
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.container}>
            {isComplete ? (
              <View style={styles.completeContainer}>
                <CheckCircle2 size={64} color="rgba(135, 206, 250, 0.9)" strokeWidth={2} />
                <Text style={styles.completeTitle}>All Set!</Text>
                <Text style={styles.completeText}>
                  Your {categoryLabel.toLowerCase()} preferences have been saved.
                </Text>
                <View style={styles.completeButtons}>
                  <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.completeButton}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.completeButtonText}>Back to Categories</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsComplete(false);
                      setSelectedItems([]);
                    }}
                    style={styles.editButton}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.editButtonText}>Edit Selection</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="rgba(135, 206, 250, 0.9)" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                {categoryDescription && (
                  <Text style={styles.description}>{categoryDescription}</Text>
                )}
                <MultiSelectSearch
                  category={categoryKey}
                  selectedItems={selectedItems}
                  onSelectionChange={handleSelectionChange}
                  maxSelections={maxSelections}
                />
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!canSave || saving}
                  style={[
                    styles.saveButton,
                    (!canSave || saving) && styles.saveButtonDisabled,
                  ]}
                  activeOpacity={0.9}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {categoryKey === 'food' 
                        ? `Save ${selectedItems.length}/5` 
                        : `Save ${selectedItems.length} Selection${selectedItems.length !== 1 ? 's' : ''}`}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  description: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  completeText: {
    fontSize: 18,
    color: 'rgba(200, 200, 200, 0.75)',
    textAlign: 'center',
    lineHeight: 26,
  },
  completeButtons: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  completeButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    width: '100%',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 18,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
