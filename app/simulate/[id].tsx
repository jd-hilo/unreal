import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, Dimensions, Animated, Image, Easing, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getTimeline, updateTimeline, getProfile } from '@/lib/storage';
import { advanceTimeline } from '@/lib/ai';
import { Avatar } from '@/components/Avatar';
import { ChevronLeft, Plus, User, Lock, DollarSign, Heart, Zap, TrendingUp, TrendingDown, Users, X, ChevronDown, ChevronUp, MapPin, Sparkles, Briefcase, ChevronRight, MoreHorizontal } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { formatDistanceToNow } from 'date-fns';
import { Colors, Fonts } from '@/constants/Theme';
import { ProgressBar } from '@/components/ProgressBar';
import Svg, { Circle, Path, Line, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = 80; // Reduced from 120
const RELATIONSHIP_GRAPH_HEIGHT = 220;
const RELATIONSHIP_GRAPH_CONTENT_WIDTH = 600;

// Helper function to parse net worth string to number
function parseNetWorth(str: string): number | null {
  if (!str || str === 'Not set' || str === '$0') return 0;
  const cleaned = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Helper function to determine currency based on country
function getCurrencyInfo(country?: string | null): { symbol: string; code: string } {
  // Always default to USD unless explicitly UK
  if (!country) return { symbol: '$', code: 'USD' };
  
  const countryUpper = country.toUpperCase();
  // Only return GBP for UK/United Kingdom
  if (countryUpper === 'UK' || countryUpper === 'UNITED KINGDOM' || countryUpper === 'GB' || countryUpper === 'GBR' || countryUpper.includes('UNITED KINGDOM')) {
    return { symbol: '£', code: 'GBP' };
  }
  
  // Everything else defaults to USD (including USA, Europe, etc.)
  return { symbol: '$', code: 'USD' };
}

// Format currency value
function formatCurrency(value: number, currencyInfo: { symbol: string; code: string }): string {
  if (value >= 1000000) {
    return `${currencyInfo.symbol}${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${currencyInfo.symbol}${(value / 1000).toFixed(1)}k`;
  }
  return `${currencyInfo.symbol}${Math.round(value).toLocaleString()}`;
}

// Animated Net Worth Component
function AnimatedNetWorth({ value, previousValue, deltaString }: { value: string; previousValue?: string; deltaString?: string }) {
  const [delta, setDelta] = useState<number | null>(null);
  const deltaAnim = useRef(new Animated.Value(0)).current;
  const deltaOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (deltaString) {
      const cleaned = deltaString.replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        setDelta(num);
      }
    } else if (previousValue && previousValue !== value) {
      const prevNum = parseNetWorth(previousValue);
      const currNum = parseNetWorth(value);
      
      if (prevNum !== null && currNum !== null) {
        const change = currNum - prevNum;
        setDelta(change);

        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();

        deltaOpacity.setValue(1);
        deltaAnim.setValue(0);
        Animated.parallel([
          Animated.timing(deltaAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(4500),
            Animated.timing(deltaOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setDelta(null);
        });
      }
    }
  }, [value, previousValue, deltaString]);

  function formatDelta(delta: number): string {
    if (Math.abs(delta) >= 1000) {
      return `${delta > 0 ? '+' : ''}$${(delta / 1000).toFixed(1)}K`;
    }
    return `${delta > 0 ? '+' : ''}$${delta.toFixed(0)}`;
  }

  return (
    <View style={styles.netWorthContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Text style={styles.statCardValueLarge} numberOfLines={1}>{value}</Text>
      </Animated.View>
    </View>
  );
}

export default function TimelineDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const timelineId = params.id as string;
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [timeline, setTimeline] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [addingScenario, setAddingScenario] = useState(false);
  const [scenarioModalVisible, setScenarioModalVisible] = useState(false);
  const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);
  const [scenarioText, setScenarioText] = useState('');
  const [assetNotifications, setAssetNotifications] = useState<Array<{ id: string; asset: any }>>([]);
  const notificationAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const [networthModalVisible, setNetworthModalVisible] = useState(false);
  const [selectedGraphYear, setSelectedGraphYear] = useState<number | null>(null);

  // Track previous values for animations
  const previousStats = useRef<any>(null);
  const previousNetWorth = useRef<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(height)).current;
  const [variantsCount, setVariantsCount] = useState(0);
  const [percentageCount, setPercentageCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Year Selection
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const lifeLogRef = useRef<View>(null);

  // Life Log Expansion
  const [isLifeLogExpanded, setIsLifeLogExpanded] = useState(false);

  // Loading messages
  const loadingMessages = [
    'Simulating your decision...',
    'Building your alternate timeline...',
    'Calculating life outcomes...',
    'Analyzing potential consequences...',
    'Mapping your future path...',
    'Processing life scenarios...',
    'Generating timeline possibilities...',
    'Evaluating decision impact...',
    'Crafting your story...',
    'Predicting future events...',
  ];

  // Loading screen animations
  const loadingPulseAnim = useRef(new Animated.Value(1)).current;
  const loadingRotateAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (timelineId && user) {
        // Reset animation
        contentSlideAnim.setValue(height);
        loadTimeline();
      }
    }, [timelineId, user, contentSlideAnim])
  );

  async function loadTimeline() {
    if (!timelineId) return;

    try {
      const [timelineData, profile] = await Promise.all([
        getTimeline(timelineId),
        user ? getProfile(user.id) : Promise.resolve(null)
      ]);
      
      if (timeline) {
        previousStats.current = timeline.stats;
        previousNetWorth.current = timeline.twin_profile?.netWorth || null;
      }
      
      console.log('Loaded timeline events count:', timelineData?.events?.length || 0);
      console.log('Loaded timeline events:', timelineData?.events);
      setTimeline(timelineData);
      setProfileData(profile);

      // Initialize years
      const startYear = new Date().getFullYear(); // Start at current year
      const currentSimYear = timelineData.current_year || 1;
      const years = Array.from({ length: currentSimYear }, (_, i) => startYear + i);
      setAvailableYears(years);
      
      // Select latest year (active year) and center it
      const activeYear = startYear + currentSimYear - 1;
      setSelectedYear(activeYear);
      
      // Center the active year after a delay to ensure layout is ready
      setTimeout(() => {
        if (scrollRef.current && years.length > 0) {
          const index = years.indexOf(activeYear);
          if (index !== -1) {
            const x = (index * ITEM_WIDTH) + (ITEM_WIDTH / 2) - (width / 2);
            scrollRef.current?.scrollTo({ x: x, animated: false });
          }
        }
      }, 200);
      
      // Try again with animation after longer delay
      setTimeout(() => {
        if (scrollRef.current && years.length > 0) {
          const index = years.indexOf(activeYear);
          if (index !== -1) {
            const x = (index * ITEM_WIDTH) + (ITEM_WIDTH / 2) - (width / 2);
            scrollRef.current?.scrollTo({ x: x, animated: true });
          }
        }
      }, 500);

      // Animate content sliding up
      Animated.spring(contentSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
      
    } catch (error) {
      console.error('Failed to load timeline:', error);
      alert('Failed to load timeline');
    }
  }

  // Handle year selection
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === 0) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears]);

  // Center the selected year
  useEffect(() => {
    if (scrollRef.current && availableYears.length > 0 && selectedYear > 0) {
      const index = availableYears.indexOf(selectedYear);
      if (index !== -1) {
        // Calculate position to center the item
        // item center = index * ITEM_WIDTH + ITEM_WIDTH / 2
        // screen center = width / 2
        // scroll position = item center - screen center
        const x = (index * ITEM_WIDTH) + (ITEM_WIDTH / 2) - (width / 2);

        // Use multiple timeouts to ensure layout is ready, especially on initial load
        setTimeout(() => {
          scrollRef.current?.scrollTo({ x: x, animated: true });
        }, 100);
        
        // Also try after a longer delay to handle initial render
        setTimeout(() => {
          scrollRef.current?.scrollTo({ x: x, animated: true });
        }, 300);
      }
    }
  }, [selectedYear, availableYears]);

  // Loading screen animations
  useEffect(() => {
    if (addingScenario) {
      // Set start time
      const start = performance.now();
      setStartTime(start);
      setElapsedTime(0);
      setVariantsCount(0);
      setPercentageCount(0);

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(loadingPulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start rotation animation
      Animated.loop(
        Animated.timing(loadingRotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Update loading messages
      setCurrentLoadingMessage(0);
      const messageInterval = setInterval(() => {
        setCurrentLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);

      // Update elapsed time
      const timeInterval = setInterval(() => {
        if (start) {
          setElapsedTime(Math.floor((performance.now() - start) / 1000));
        }
      }, 1000);

      // Animate variants count - continuous growth
      const variantsInterval = setInterval(() => {
        setVariantsCount(prev => {
          const baseIncrement = Math.max(50, 500 - Math.floor(prev / 100));
          const randomIncrement = Math.floor(Math.random() * 300);
          return prev + baseIncrement + randomIncrement;
        });
      }, 50);

      // Animate percentage counter - increments by 1% up to 99%
      const percentageInterval = setInterval(() => {
        setPercentageCount(prev => {
          if (prev >= 99) return 99;
          return prev + 1;
        });
      }, 300);

      return () => {
        clearInterval(messageInterval);
        clearInterval(timeInterval);
        clearInterval(variantsInterval);
        clearInterval(percentageInterval);
      };
    } else {
      loadingPulseAnim.setValue(1);
      loadingRotateAnim.setValue(0);
      setCurrentLoadingMessage(0);
      setVariantsCount(0);
      setPercentageCount(0);
      setElapsedTime(0);
      setStartTime(null);
    }
  }, [addingScenario]);

  async function handleAddScenario() {
    if (!scenarioText.trim() || !timeline || !user) return;

    if (!isPremium) {
      const currentYear = timeline.current_year || 1;
      if (currentYear >= 3) {
        router.push('/premium');
        return;
      }
    }

    setScenarioModalVisible(false);
    setAddingScenario(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const profile = await getProfile(user.id);
      const currentYear = timeline.current_year || 1;
      const advancement = await advanceTimeline({
        currentProfile: profile,
        currentStats: timeline.stats,
        timelineHistory: timeline.events || [],
        userDecision: scenarioText,
        currentAge: timeline.current_age,
        currentYear: currentYear,
        existingRelationships: timeline.relationships || [],
      });

      const newStats = {
        money: Math.max(0, Math.min(10, timeline.stats.money + advancement.statDeltas.money)),
        happiness: Math.max(0, Math.min(10, timeline.stats.happiness + advancement.statDeltas.happiness)),
        freedom: Math.max(0, Math.min(10, timeline.stats.freedom + advancement.statDeltas.freedom)),
        growth: Math.max(0, Math.min(10, timeline.stats.growth + advancement.statDeltas.growth)),
        relationships: Math.max(0, Math.min(10, timeline.stats.relationships + advancement.statDeltas.relationships)),
      };

      previousStats.current = timeline.stats;
      previousNetWorth.current = timeline.twin_profile?.netWorth || null;
      
      // Store snapshot for current year before advancing
      const calendarStartYear = new Date().getFullYear();
      const currentCalendarYear = calendarStartYear + currentYear - 1;
      const yearSnapshots = timeline.twin_profile?.year_snapshots || {};
      
      // Save current state as snapshot for the current year
      yearSnapshots[currentCalendarYear] = {
        netWorth: timeline.twin_profile?.netWorth || null,
        location: timeline.twin_profile?.location || null,
        job: timeline.twin_profile?.job || null,
        relationships_count: timeline.relationships?.length || 0,
        relationships: [...(timeline.relationships || [])],
        stats: { ...timeline.stats },
        assets: [...(timeline.assets || [])],
      };
      
      const previousYearSnapshot = {
        netWorth: timeline.twin_profile?.netWorth || null,
        location: timeline.twin_profile?.location || null,
        job: timeline.twin_profile?.job || null,
        relationships_count: timeline.relationships?.length || 0,
        stats: { ...timeline.stats },
      };

      // Debug: Check if events were generated
      console.log('=== EVENT GENERATION DEBUG ===');
      console.log('Advancement result:', {
        newEventsCount: advancement.newEvents?.length || 0,
        newEvents: advancement.newEvents,
        hasNewEvents: !!advancement.newEvents && advancement.newEvents.length > 0
      });
      
      // CRITICAL: Verify events are being generated
      if (!advancement.newEvents || advancement.newEvents.length === 0) {
        console.error('⚠️ WARNING: No events generated by AI!');
        console.log('Advancement object:', advancement);
      }
      
      // Ensure all new events have the year field set
      // Calculate the actual calendar year for the new simulation year
      const newSimYear = currentYear + 1; // The year we're advancing to
      const actualCalendarYear = calendarStartYear + newSimYear - 1; // Convert simulation year to calendar year
      
      // Ensure we have events - if AI didn't generate any, create a fallback
      let eventsToAdd = advancement.newEvents || [];
      if (eventsToAdd.length === 0) {
        console.warn('No events generated by AI, creating fallback event');
        eventsToAdd = [{
          time: `Year ${newSimYear}, Month 6`,
          title: 'Life Progress',
          description: scenarioText || 'Your life continues to evolve.',
          type: 'milestone',
          year: actualCalendarYear,
          month: 6,
        }];
      }
      
      const newEventsWithYear = eventsToAdd.map((event: any) => {
        // ALWAYS set the year to the NEW calendar year we're advancing to
        // The AI generates events for the NEXT year, so they should all have the new year
        event.year = actualCalendarYear;
        
        console.log(`Setting event year to ${actualCalendarYear} (sim year ${newSimYear}):`, event.title);
        
        return event;
      });
      
      const updatedEvents = [...(timeline.events || []), ...newEventsWithYear];
      
      // Debug: Log events to ensure they're being generated
      console.log('=== EVENT YEAR ASSIGNMENT ===');
      console.log('Current sim year:', currentYear);
      console.log('New sim year:', newSimYear);
      console.log('Calendar start year:', calendarStartYear);
      console.log('Actual calendar year for new events:', actualCalendarYear);
      console.log('New events generated:', newEventsWithYear.length);
      console.log('Total events after update:', updatedEvents.length);
      console.log('All new events with years:', newEventsWithYear.map(e => ({ title: e.title, year: e.year })));
      
      const existingAssets = timeline.assets || [];
      const removedAssetTypes = (advancement as any).removedAssets || [];
      const filteredAssets = existingAssets.filter((asset: any) => 
        !removedAssetTypes.includes(asset.type) && !removedAssetTypes.includes(asset.name)
      );
      const updatedAssets = [...filteredAssets, ...(advancement.newAssets || [])];

      // Ensure events array is properly formatted for database (jsonb[])
      const eventsForDB = updatedEvents.map((event: any) => ({
        time: event.time || '',
        title: event.title || '',
        description: event.description || '',
        type: event.type || 'milestone',
        year: event.year || null,
        month: event.month || null,
        people: event.people || [],
      }));

      const updatedTimeline = await updateTimeline(timelineId, {
        current_age: advancement.newAge,
        current_year: currentYear + 1,
        stats: newStats,
        events: eventsForDB,
        assets: updatedAssets,
        twin_profile: {
          ...advancement.profileUpdates,
          profileDeltas: advancement.profileDeltas,
          previous_year_snapshot: previousYearSnapshot,
          year_snapshots: yearSnapshots, // Store all year snapshots
        },
        relationships: advancement.relationships || timeline.relationships || [],
      });
      
      console.log('=== NETWORTH DEBUG ===');
      console.log('AI generated networth:', advancement.profileUpdates?.netWorth);
      console.log('AI generated networth delta:', advancement.profileDeltas?.netWorth);
      console.log('Updated timeline networth:', updatedTimeline?.twin_profile?.netWorth);
      
      console.log('=== DATABASE SAVE DEBUG ===');
      console.log('Events formatted for DB:', eventsForDB.length);
      console.log('Events being saved:', eventsForDB);
      console.log('Updated timeline events count:', updatedTimeline?.events?.length || 0);
      
      // CRITICAL: Verify events were saved
      if (!updatedTimeline?.events || updatedTimeline.events.length === 0) {
        console.error('⚠️ WARNING: No events in updated timeline from DB!');
      }

      if (advancement.newAssets && advancement.newAssets.length > 0) {
        const newNotifications = advancement.newAssets.map((asset, index) => ({
          id: `${Date.now()}-${index}`,
          asset,
        }));
        setAssetNotifications(newNotifications);
        
        newNotifications.forEach((notif) => {
          const animValue = new Animated.Value(0);
          notificationAnimations.current.set(notif.id, animValue);
          Animated.spring(animValue, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        });

        setTimeout(() => {
          newNotifications.forEach((notif) => {
            dismissNotification(notif.id);
          });
        }, 5000);
      }

      // Reload timeline to ensure we have the latest data including events
      const reloadedTimeline = await getTimeline(timelineId);
      console.log('Reloaded timeline events:', reloadedTimeline?.events?.length || 0);
      setTimeline(reloadedTimeline || updatedTimeline);
      setScenarioText('');
      
      // Update years
      const startYear = new Date().getFullYear();
      const newMaxYear = currentYear + 1;
      const years = Array.from({ length: newMaxYear }, (_, i) => startYear + i);
      setAvailableYears(years);
      setSelectedYear(startYear + newMaxYear - 1);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Failed to add scenario:', error);
      const errorMessage = error?.message || 'Failed to simulate scenario. Please try again.';
      alert(errorMessage);
    } finally {
      setAddingScenario(false);
    }
  }

  function getAssetEmoji(assetType: string): string {
    switch (assetType) {
      case 'car': return '🚗';
      case 'apartment': return '🏢';
      case 'house': return '🏠';
      case 'pet': return '🐾';
      default: return '✨';
    }
  }

  function dismissNotification(id: string) {
    const animValue = notificationAnimations.current.get(id);
    if (animValue) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setAssetNotifications((prev) => prev.filter((n) => n.id !== id));
        notificationAnimations.current.delete(id);
      });
    } else {
      setAssetNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }

  function getEventsForYear(year: number) {
    if (!timeline?.events || timeline.events.length === 0) {
      console.log('No events found in timeline');
      return [];
    }
    
    // Events are now stored with actual calendar years (2025, 2026, etc.)
    // So we can directly compare with the selected year
    const filtered = timeline.events.filter((e: any) => {
      // First try to use the year field directly (should be calendar year now)
      if (e.year !== undefined && e.year !== null) {
        return e.year === year;
      }
      
      // Fallback: Try to parse Year X from time string and convert to calendar year
      if (e.time) {
        const yearMatch = e.time.match(/Year\s+(\d+)/i);
        if (yearMatch) {
          const simYear = parseInt(yearMatch[1]);
          const calendarStartYear = new Date().getFullYear();
          const eventCalendarYear = calendarStartYear + simYear - 1;
          return eventCalendarYear === year;
        }
      }
      
      return false;
    });
    
    console.log(`Events for year ${year}:`, filtered.length, 'out of', timeline.events.length, 'total events');
    return filtered;
  }

  // Get snapshot data for a specific year
  function getSnapshotForYear(year: number) {
    if (!timeline) return null;
    
    const yearSnapshots = timeline.twin_profile?.year_snapshots || {};
    const snapshot = yearSnapshots[year];
    
    // If snapshot exists, return it
    if (snapshot) {
      return snapshot;
    }
    
    // If no snapshot, check if this is the current year
    const calendarStartYear = new Date().getFullYear();
    const currentSimYear = timeline.current_year || 1;
    const currentCalendarYear = calendarStartYear + currentSimYear - 1;
    
    if (year === currentCalendarYear) {
      // Return current state for current year
      return {
        netWorth: timeline.twin_profile?.netWorth || null,
        location: timeline.twin_profile?.location || null,
        job: timeline.twin_profile?.job || null,
        relationships_count: timeline.relationships?.length || 0,
        relationships: timeline.relationships || [],
        stats: timeline.stats || {},
        assets: timeline.assets || [],
      };
    }
    
    // For previous years without snapshots, try to reconstruct from previous_year_snapshot
    if (year === currentCalendarYear - 1 && timeline.twin_profile?.previous_year_snapshot) {
      const prevSnapshot = timeline.twin_profile.previous_year_snapshot;
      return {
        netWorth: prevSnapshot.netWorth || null,
        location: prevSnapshot.location || null,
        job: prevSnapshot.job || null,
        relationships_count: prevSnapshot.relationships_count || 0,
        relationships: [], // We don't have full relationship list in previous snapshot
        stats: prevSnapshot.stats || {},
        assets: [], // We don't have assets in previous snapshot
      };
    }
    
    return null;
  }

  // Get display data for selected year
  function getDisplayDataForYear(year: number) {
    const snapshot = getSnapshotForYear(year);
    const currentYear = new Date().getFullYear();
    const isFirstYear = year === currentYear; // First year is 2026 (current year)
    
    if (snapshot) {
      // For first year (2026), prefer job from profile's core_json.primary_role
      const job = isFirstYear && profileData?.core_json?.primary_role 
        ? profileData.core_json.primary_role 
        : snapshot.job;
      
      return {
        netWorth: snapshot.netWorth,
        location: snapshot.location,
        job: job,
        relationships: snapshot.relationships || [],
        relationships_count: snapshot.relationships_count || snapshot.relationships?.length || 0,
        stats: snapshot.stats,
        assets: snapshot.assets || [],
      };
    }
    
    // Fallback to current timeline data, but prefer profile job for first year
    const job = isFirstYear && profileData?.core_json?.primary_role 
      ? profileData.core_json.primary_role 
      : timeline?.twin_profile?.job || null;
    
    return {
      netWorth: timeline?.twin_profile?.netWorth || null,
      location: timeline?.twin_profile?.location || null,
      job: job,
      relationships: timeline?.relationships || [],
      relationships_count: timeline?.relationships?.length || 0,
      stats: timeline?.stats || {},
      assets: timeline?.assets || [],
    };
  }
  
  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'good': return '#10B981';
      case 'bad': return '#EF4444';
      case 'complicated': return '#F59E0B';
      default: return '#9CA3AF';
    }
  }
  
  function getRelationshipColor(type: string) {
    switch (type?.toLowerCase()) {
      case 'partner': return '#EC4899';
      case 'family': return '#0EA5E9';
      case 'friend': return '#10B981';
      default: return '#9CA3AF';
    }
  }

  function getRelationshipEmoji(type: string): string {
    const relType = type?.toLowerCase() || '';
    if (relType.includes('partner') || relType.includes('spouse')) return '❤️';
    if (relType.includes('family') || relType.includes('parent') || relType.includes('sibling') || relType.includes('child')) return '👨‍👩‍👧‍👦';
    if (relType.includes('coworker') || relType.includes('boss') || relType.includes('colleague') || relType.includes('business')) return '💼';
    if (relType.includes('mentor')) return '🎓';
    if (relType.includes('friend')) return '👤';
    return '👤';
  }

  // Parse networth string to number
  function parseNetWorthValue(netWorthStr: string): number {
    if (!netWorthStr || netWorthStr === 'Not set' || netWorthStr === '$0' || netWorthStr === '£0' || netWorthStr === '€0') return 0;
    // Remove all currency symbols including $, £, €, and any other non-numeric characters except decimal point
    const cleaned = netWorthStr.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // Get networth history from timeline
  function getNetworthHistory() {
    if (!timeline) return [];
    const currentYear = new Date().getFullYear();
    const history: Array<{ year: number; networth: number; delta?: number }> = [];
    
    // Build history from all available years
    const startYear = currentYear;
    const currentSimYear = timeline.current_year || 1;
    
    // Add previous year snapshot if available
    if (timeline.twin_profile?.previous_year_snapshot?.netWorth) {
      const prevNetworth = parseNetWorthValue(timeline.twin_profile.previous_year_snapshot.netWorth);
      const prevYear = startYear + currentSimYear - 2;
      history.push({ year: prevYear, networth: prevNetworth });
    }
    
    // Add current year
    const currentNetworth = parseNetWorthValue(timeline.twin_profile?.netWorth || '£0');
    const currentYearValue = startYear + currentSimYear - 1;
    const prevNetworth = history.length > 0 ? history[history.length - 1].networth : 0;
    const delta = currentNetworth - prevNetworth;
    history.push({ year: currentYearValue, networth: currentNetworth, delta });
    
    // Sort by year ascending
    return history.sort((a, b) => a.year - b.year);
  }

  // Get networth breakdown sources for selected year
  function getNetworthBreakdown() {
    if (!timeline) return [];
    const displayData = getDisplayDataForYear(selectedYear);
    const currencyInfo = getCurrencyInfo(profileData?.core_json?.country || profileData?.current_location);
    const breakdown: Array<{ source: string; value: string; valueNum: number; description?: string }> = [];
    
    // Assets - show individual assets from snapshot
    if (displayData.assets && displayData.assets.length > 0) {
      displayData.assets.forEach((asset: any) => {
        const value = parseNetWorthValue(asset.value || '£0');
        if (value > 0) {
          breakdown.push({
            source: asset.name || asset.type || 'Asset',
            value: `${currencyInfo.symbol}${value.toLocaleString()}`,
            valueNum: value,
            description: asset.type || 'Asset'
          });
        }
      });
    }
    
    // Job/Income (estimated from job title)
    if (displayData.job && displayData.job !== 'Unemployed') {
      breakdown.push({
        source: 'Career',
        value: 'Ongoing',
        valueNum: 0,
        description: displayData.job
      });
    }
    
    // If no breakdown, show total
    if (breakdown.length === 0) {
      const totalNetworth = parseNetWorthValue(displayData.netWorth || '£0');
      if (totalNetworth > 0) {
        breakdown.push({
          source: 'Total Networth',
          value: `${currencyInfo.symbol}${totalNetworth.toLocaleString()}`,
          valueNum: totalNetworth,
          description: 'Current value'
        });
      }
    }
    
    return breakdown;
  }

  // Get biggest mover (item that added most to networth)
  function getBiggestMover() {
    const breakdown = getNetworthBreakdown();
    if (breakdown.length === 0) return null;
    
    // Filter out "Ongoing" items and find the one with highest numeric value
    const numericItems = breakdown.filter(item => item.valueNum > 0);
    if (numericItems.length === 0) return null;
    
    // Sort by value descending and return the first one
    const sorted = [...numericItems].sort((a, b) => b.valueNum - a.valueNum);
    return sorted[0];
  }


  if (addingScenario) {
    const rotateInterpolate = loadingRotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingGradientContainer}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
            <View style={styles.loadingContent}>
              <View style={styles.orbContainer}>
                <Animated.View
                  style={[
                    styles.orbOuter,
                    {
                      transform: [
                        { scale: loadingPulseAnim },
                        { rotate: rotateInterpolate },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={Colors.gradients.turquoise}
                    style={styles.orbGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <View style={styles.orbInner}>
                  <View style={styles.cubeShadowWrapper}>
                    <Image 
                      source={require('@/assets/images/cube.png')}
                      style={styles.loadingCubeIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.loadingText}>Simulating the next year...</Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusBlur}>
                    <Text style={styles.statusText}>
                      {loadingMessages[currentLoadingMessage]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Statistics */}
              <View style={styles.statsContainer}>
                <View style={[styles.statCard, styles.variantsCard]}>
                  <Text style={styles.statValue} numberOfLines={1}>{variantsCount.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Variants</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{percentageCount}%</Text>
                  <Text style={styles.statLabel}>Complete</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{elapsedTime}s</Text>
                  <Text style={styles.statLabel}>Elapsed</Text>
                </View>
              </View>

              {/* Loading Dots */}
              <View style={styles.dotsContainer}>
                {[0, 1, 2].map((index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: Colors.textSecondary,
                        transform: [
                          {
                            scale: loadingPulseAnim.interpolate({
                              inputRange: [1, 1.1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                        opacity: loadingPulseAnim.interpolate({
                          inputRange: [1, 1.1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.backgroundGradient}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          
          {timeline && (
          <Animated.View 
            style={[
              styles.contentContainer,
              {
                transform: [{ translateY: contentSlideAnim }],
              },
            ]}
          >
          {/* Header & Year Selector */}
          <View style={styles.headerContainer}>
            <View style={styles.topNav}>
               <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
                 <ChevronLeft size={24} color={Colors.textPrimary} />
               </TouchableOpacity>
               <Text style={styles.headerTitle}>This is you in</Text>
               <View style={styles.navButton} />
            </View>

            <View style={styles.yearSelectorContainer}>
              <ScrollView 
                ref={scrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.yearSelectorContent}
                decelerationRate="fast"
              >
                {/* Spacer for centering */}
                <View style={{ width: width / 2 - (ITEM_WIDTH / 2) }} />
                
                {availableYears.map((year, index) => {
                  const isSelected = selectedYear === year;
                  
                  return (
                    <View key={year} style={styles.yearItemWrapper}>
                      {index > 0 && (
                        <View style={styles.connectorContainer}>
                          <View style={styles.connectorLine} />
                          <View style={styles.connectorDot} />
                          <View style={styles.connectorLine} />
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedYear(year);
                          // Reload timeline to ensure we have latest snapshot data
                          if (timelineId) {
                            try {
                              const timelineData = await getTimeline(timelineId);
                              setTimeline(timelineData);
                            } catch (error) {
                              console.error('Failed to reload timeline:', error);
                            }
                          }
                        }}
                        activeOpacity={0.9}
                      >
                        {isSelected ? (
                          <LinearGradient
                            colors={['#2563EB', '#0EA5E9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.yearPillSelected}
                          >
                            <Text style={styles.yearTextSelected}>{year}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.yearPill}>
                            <Text style={styles.yearText}>{year}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
                
                {/* Visual Add Button at the end */}
                <View style={styles.yearItemWrapper}>
                  <View style={styles.connectorContainer}>
                    <View style={styles.connectorLine} />
                    <View style={styles.connectorDot} />
                    <View style={styles.connectorLine} />
                  </View>
                  <TouchableOpacity 
                    style={styles.yearPill}
                    onPress={() => {
                      if (!isPremium && timeline.current_year >= 3) {
                        router.push('/premium');
                        return;
                      }
                      setScenarioModalVisible(true);
                    }}
                  >
                    <Text style={[styles.yearText, { fontWeight: '700' }]}>Add</Text>
                  </TouchableOpacity>
                </View>

                {/* Spacer for centering */}
                <View style={{ width: width / 2 - (ITEM_WIDTH / 2) }} />
              </ScrollView>
            </View>
          </View>

          {/* Main Scroll Content */}
          <ScrollView 
            ref={mainScrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mainScrollContent}
            style={styles.mainScrollView}
          >
            {/* Identity Card */}
            <View style={styles.identityCard}>
              {(() => {
                const displayData = getDisplayDataForYear(selectedYear);
                return (
                  <>
                    <View style={styles.locationRow}>
                      <MapPin size={14} color="#2563EB" fill="#2563EB" />
                      <Text style={styles.locationText}>{displayData.location || 'Unknown Location'}</Text>
                    </View>

                    <View style={styles.avatarSection}>
                       <View style={styles.avatarWrapper}>
                          <Image 
                            source={require('@/assets/images/manwhite.png')} 
                            style={{ width: 80, height: 80, borderRadius: 40 }}
                            resizeMode="cover"
                          />
                          <View style={styles.ageBadge}>
                            <LinearGradient
                              colors={['#FFFFFF', '#FAFAFA']}
                              style={styles.ageBadgeGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={styles.ageBadgeValue}>{timeline.current_age}</Text>
                              <Text style={styles.ageBadgeLabel}>Years</Text>
                            </LinearGradient>
                          </View>
                       </View>
                    </View>

                    <View style={styles.roleSection}>
                       <View style={styles.roleRow}>
                         <Briefcase size={18} color="#7C3AED" fill="#7C3AED" />
                         <Text style={styles.roleTitle}>{displayData.job || 'Unemployed'}</Text>
                       </View>
                    </View>
                  </>
                );
              })()}

              {/* Progress Stats */}
              <View style={styles.progressStatsContainer}>
                {(() => {
                  const displayData = getDisplayDataForYear(selectedYear);
                  const stats = displayData.stats || {};
                  return (
                    <>
                      {/* Happiness */}
                      <View style={styles.biometricColumn}>
                         <View style={styles.biometricHeader}>
                            <Text style={styles.biometricLabel}>Happiness</Text>
                            {(() => {
                              const happinessDelta = (stats.happiness || 5) - 5;
                              const deltaColor = happinessDelta >= 0 ? '#10B981' : '#EF4444';
                              return (
                                <Text style={[styles.biometricDelta, { color: deltaColor }]}>
                                  {happinessDelta >= 0 ? '+' : ''}{happinessDelta.toFixed(1)}
                                </Text>
                              );
                            })()}
                         </View>
                         <View style={styles.biometricBarRow}>
                            <View style={styles.biometricBarTrack}>
                               <View style={[
                                 styles.biometricBarFill, 
                                 { width: `${(stats.happiness || 5) * 10}%`, backgroundColor: '#4ADE80' }
                               ]} />
                            </View>
                            <Text style={styles.biometricValueText}>{Math.round(stats.happiness || 5)}/10</Text>
                         </View>
                      </View>

                      {/* Freedom */}
                      <View style={styles.biometricColumn}>
                         <View style={styles.biometricHeader}>
                            <Text style={styles.biometricLabel}>Freedom</Text>
                            {(() => {
                              const freedomDelta = (stats.freedom || 5) - 5;
                              const deltaColor = freedomDelta >= 0 ? '#10B981' : '#EF4444';
                              return (
                                <Text style={[styles.biometricDelta, { color: deltaColor }]}>
                                  {freedomDelta >= 0 ? '+' : ''}{freedomDelta.toFixed(1)}
                                </Text>
                              );
                            })()}
                         </View>
                         <View style={styles.biometricBarRow}>
                            <View style={styles.biometricBarTrack}>
                               <View style={[
                                 styles.biometricBarFill, 
                                 { width: `${(stats.freedom || 5) * 10}%`, backgroundColor: '#4ADE80' }
                               ]} />
                            </View>
                            <Text style={styles.biometricValueText}>{Math.round(stats.freedom || 5)}/10</Text>
                         </View>
                      </View>
                    </>
                  );
                })()}
              </View>

              {/* Stat Cards */}
              <View style={styles.statCardsRow}>
                {(() => {
                  const displayData = getDisplayDataForYear(selectedYear);
                  const calendarStartYear = new Date().getFullYear();
                  const currentSimYear = timeline.current_year || 1;
                  const currentCalendarYear = calendarStartYear + currentSimYear - 1;
                  
                  // Get previous year snapshot for delta calculation
                  const prevYearSnapshot = getSnapshotForYear(selectedYear - 1);
                  const prevNetWorth = prevYearSnapshot?.netWorth || null;
                  const prevRelationshipsCount = prevYearSnapshot?.relationships_count || 0;
                  
                  return (
                    <>
                      <TouchableOpacity 
                        style={[styles.statCardLarge, { backgroundColor: '#F0FDF4' }]}
                        onPress={() => setNetworthModalVisible(true)}
                        activeOpacity={0.7}
                      >
                         <View style={styles.statCardChevron}>
                           <ChevronRight size={16} color="#15803D" />
                         </View>
                         <View style={styles.statCardHeaderCentered}>
                            <DollarSign size={14} color="#15803D" fill="#15803D" />
                            <Text style={[styles.statCardTitle, { color: '#15803D' }]}>Networth</Text>
                         </View>
                         <View style={styles.statCardValueColumn}>
                            <AnimatedNetWorth 
                              value={displayData.netWorth || '£0'} 
                              previousValue={prevNetWorth || undefined}
                              deltaString={selectedYear === currentCalendarYear ? timeline.twin_profile?.profileDeltas?.netWorth : undefined}
                            />
                            {(() => {
                              // Calculate delta from previous year
                              const currentNetWorth = parseNetWorthValue(displayData.netWorth || '£0');
                              const prevNetWorthValue = parseNetWorthValue(prevNetWorth || '£0');
                              const netWorthDelta = currentNetWorth - prevNetWorthValue;
                              const currencyInfo = getCurrencyInfo(profileData?.core_json?.country || profileData?.current_location);
                              const deltaString = netWorthDelta >= 0 
                                ? `+${currencyInfo.symbol}${Math.abs(netWorthDelta / 1000).toFixed(0)}k`
                                : `-${currencyInfo.symbol}${Math.abs(netWorthDelta / 1000).toFixed(0)}k`;
                              const deltaColor = netWorthDelta >= 0 ? '#10B981' : '#EF4444';
                              return (
                                <Text style={[styles.statDeltaSmall, { color: deltaColor }]}>
                                  {deltaString}
                                </Text>
                              );
                            })()}
                         </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                         style={[styles.statCardLarge, { backgroundColor: '#FEFCE8' }]} 
                         onPress={() => setRelationshipModalVisible(true)}
                      >
                         <View style={styles.statCardChevron}>
                           <ChevronRight size={16} color="#854D0E" />
                         </View>
                         <View style={styles.statCardHeaderCentered}>
                            <Users size={14} color="#854D0E" fill="#854D0E" />
                            <Text style={[styles.statCardTitle, { color: '#854D0E' }]}>Connections</Text>
                         </View>
                         <View style={styles.statCardValueRow}>
                           <Text style={styles.statCardValueLarge}>{displayData.relationships_count}</Text>
                           {(() => {
                             const connectionsDelta = displayData.relationships_count - prevRelationshipsCount;
                             const deltaColor = connectionsDelta >= 0 ? '#10B981' : '#EF4444';
                             return (
                               <Text style={[styles.statDeltaSmall, { color: deltaColor }]}>
                                 {connectionsDelta >= 0 ? '+' : ''}{connectionsDelta}
                               </Text>
                             );
                           })()}
                         </View>
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </View>
            </View>

            {/* Life Log Expandable Section - Hide for first year */}
            {timeline.current_year > 1 && (
              <View ref={lifeLogRef} style={styles.lifeLogSection}>
                <TouchableOpacity 
                  style={styles.lifeLogButton}
                  onPress={() => {
                    const newExpanded = !isLifeLogExpanded;
                    setIsLifeLogExpanded(newExpanded);
                    if (newExpanded && lifeLogRef.current && mainScrollRef.current) {
                      // Scroll to the Life Log section when expanded
                      setTimeout(() => {
                        lifeLogRef.current?.measureLayout(
                          mainScrollRef.current as any,
                          (x, y) => {
                            mainScrollRef.current?.scrollTo({ y: y - 20, animated: true });
                          },
                          () => {}
                        );
                      }, 100);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.lifeLogButtonContent}>
                    <Text style={styles.lifeLogButtonTitle}>Life Log</Text>
                    <Text style={styles.lifeLogButtonSubtitle}>
                      {getEventsForYear(selectedYear).length} events in {selectedYear}
                    </Text>
                  </View>
                  {isLifeLogExpanded ? (
                    <ChevronUp size={20} color={Colors.textSecondary} />
                  ) : (
                    <ChevronDown size={20} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>

                {isLifeLogExpanded && (
                  <View style={styles.lifeLogContent}>
                    {getEventsForYear(selectedYear).length > 0 ? (
                      getEventsForYear(selectedYear).map((event: any, idx: number) => (
                        <View key={idx} style={styles.questCard}>
                          <View style={styles.questHeader}>
                            <Text style={styles.questTitle}>{event.title}</Text>
                            {event.time && (
                              <Text style={styles.questTime}>{event.time}</Text>
                            )}
                          </View>
                          <Text style={styles.questDesc}>{event.description}</Text>
                          {event.people && event.people.length > 0 && (
                            <View style={styles.peopleTags}>
                              {event.people.map((person: string, pIndex: number) => (
                                <View key={pIndex} style={styles.personTag}>
                                  <Text style={styles.personTagText}>{person}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          <View style={styles.timelinePoint} />
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyEvents}>
                        <Text style={styles.emptyEventsText}>No events recorded for {selectedYear}.</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
            
            {/* Spacer for fixed button */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Fixed Simulate Button */}
          <View style={styles.bottomActionContainer}>
            <TouchableOpacity
              onPress={() => {
                if (!isPremium) {
                  const currentYear = timeline.current_year || 1;
                  if (currentYear >= 3) {
                    router.push('/premium');
                    return;
                  }
                }
                setScenarioModalVisible(true);
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#2563EB', '#0EA5E9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.simulateButton}
              >
                <Text style={styles.simulateButtonText}>Simulate year {selectedYear + 1}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          </Animated.View>
          )}
        </SafeAreaView>

        {/* Modals */}
        <Modal
          visible={scenarioModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setScenarioModalVisible(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Anything you want to test?</Text>
                </View>
                <TouchableOpacity onPress={() => setScenarioModalVisible(false)} style={styles.modalClose}>
                  <X size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Any life events you want to include to effect the simulation?
              </Text>
              <TextInput
                style={styles.scenarioInput}
                placeholder="E.g., I decide to quit my job and travel the world..."
                placeholderTextColor={Colors.textTertiary}
                value={scenarioText}
                onChangeText={setScenarioText}
                multiline
                autoFocus
              />
              <TouchableOpacity
                onPress={handleAddScenario}
                disabled={!scenarioText.trim() || addingScenario}
                style={[styles.modalButton, (!scenarioText.trim() || addingScenario) && styles.modalButtonDisabled]}
              >
                <LinearGradient
                  colors={(!scenarioText.trim() || addingScenario) ? ['#999', '#AAA'] : ['#2563EB', '#0EA5E9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  {addingScenario ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonText}>Simulate Next Year</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={relationshipModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRelationshipModalVisible(false)}
        >
          <View style={styles.relationshipModalOverlay}>
            <View style={[styles.modalContent, styles.relationshipModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Connections</Text>
                <TouchableOpacity onPress={() => setRelationshipModalVisible(false)}>
                  <X size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.relationshipsList} showsVerticalScrollIndicator={false}>
                {(() => {
                  const displayData = getDisplayDataForYear(selectedYear);
                  const relationships = displayData.relationships || [];
                  return relationships.length > 0 ? (
                    relationships.map((rel: any, index: number) => (
                      <View key={index} style={styles.relationshipCard}>
                        <View style={styles.relationshipHeader}>
                          <Text style={styles.relationshipName}>{rel.name}</Text>
                          <View style={[styles.relationshipTypeTag, { backgroundColor: getRelationshipColor(rel.type) + '20' }]}>
                            <Text style={[styles.relationshipTypeText, { color: getRelationshipColor(rel.type) }]}>{rel.type}</Text>
                          </View>
                        </View>
                        <Text style={styles.relationshipStatus}>Status: <Text style={{color: getStatusColor(rel.status), fontWeight: '700'}}>{rel.status}</Text></Text>
                        <Text style={styles.relationshipDesc}>{rel.description}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyEvents}>
                      <Text style={styles.emptyEventsText}>No relationships yet.</Text>
                    </View>
                  );
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Networth Modal */}
        <Modal
          visible={networthModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setNetworthModalVisible(false)}
        >
          <View style={styles.relationshipModalOverlay}>
            <View style={[styles.modalContent, styles.networthModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Networth</Text>
                <TouchableOpacity onPress={() => setNetworthModalVisible(false)}>
                  <X size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <View style={{ flex: 1 }}>
                <ScrollView 
                  style={styles.networthModalScroll} 
                  contentContainerStyle={styles.networthModalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                {/* Current Networth */}
                <View style={styles.networthCurrentSection}>
                  <Text style={styles.networthCurrentLabel}>Networth for {selectedYear}</Text>
                  <Text style={styles.networthCurrentValue} numberOfLines={1}>
                    {(() => {
                      const displayData = getDisplayDataForYear(selectedYear);
                      const currencyInfo = getCurrencyInfo(profileData?.core_json?.country || profileData?.current_location);
                      const networthStr = displayData.netWorth || '0';
                      const networthValue = parseNetWorthValue(networthStr);
                      return `${currencyInfo.symbol}${Math.round(networthValue).toLocaleString()}`;
                    })()}
                  </Text>
                </View>

                {/* Breakdown */}
                {getNetworthBreakdown().length > 0 ? (
                  <View style={styles.networthBreakdownSection}>
                    <Text style={styles.networthSectionTitle}>Breakdown</Text>
                    
                    {/* Biggest Mover Explanation */}
                    {(() => {
                      const biggestMover = getBiggestMover();
                      if (biggestMover) {
                        return (
                          <View style={styles.biggestMoverExplanation}>
                            <Text style={styles.biggestMoverText}>
                              <Text style={styles.biggestMoverLabel}>Biggest Mover: </Text>
                              {biggestMover.source} contributed {biggestMover.value} to your networth
                              {biggestMover.description && biggestMover.description !== biggestMover.source && (
                                <Text style={styles.biggestMoverDetail}> ({biggestMover.description})</Text>
                              )}
                            </Text>
                          </View>
                        );
                      }
                      return null;
                    })()}
                    
                    {getNetworthBreakdown().map((item, index) => {
                      const currencyInfo = getCurrencyInfo(profileData?.core_json?.country || profileData?.current_location);
                      // Convert item.value to use correct currency
                      const valueStr = item.value.replace(/[£$€]/g, '');
                      const valueNum = parseFloat(valueStr.replace(/[^0-9.]/g, '')) || 0;
                      const formattedValue = valueNum > 0 ? `${currencyInfo.symbol}${Math.round(valueNum).toLocaleString()}` : item.value;
                      
                      return (
                        <View key={index} style={styles.breakdownItem}>
                          <View style={styles.breakdownItemContent}>
                            <Text style={styles.breakdownSource}>{item.source}</Text>
                            {item.description && (
                              <Text style={styles.breakdownDescription}>{item.description}</Text>
                            )}
                          </View>
                          <Text style={styles.breakdownValue}>{formattedValue}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.networthBreakdownSection}>
                    <Text style={styles.networthSectionTitle}>Breakdown</Text>
                    <Text style={styles.emptyBreakdownText}>No breakdown available</Text>
                  </View>
                )}

                {/* Graph */}
                {getNetworthHistory().length > 0 ? (() => {
                  const history = getNetworthHistory();
                  const currencyInfo = getCurrencyInfo(profileData?.core_json?.country || profileData?.current_location);
                  
                  // Chart dimensions
                  const chartWidth = Math.max(400, (history.length - 1) * 80);
                  const chartHeight = 220;
                  const paddingTop = 20;
                  const paddingBottom = 60;
                  const paddingLeft = 50;
                  const paddingRight = 20;
                  const graphWidth = chartWidth - paddingLeft - paddingRight;
                  const graphHeight = chartHeight - paddingTop - paddingBottom;
                  
                  // Calculate min/max for scaling
                  const values = history.map(p => p.networth);
                  const maxValue = Math.max(...values, 1);
                  const minValue = Math.min(...values, 0);
                  const range = maxValue - minValue || 1;
                  
                  // Generate Y-axis labels
                  const yAxisSteps = 4;
                  const yAxisLabels: number[] = [];
                  for (let i = 0; i <= yAxisSteps; i++) {
                    yAxisLabels.push(minValue + (range / yAxisSteps) * i);
                  }
                  
                  // Convert data points to SVG coordinates
                  const points = history.map((point, index) => {
                    const x = paddingLeft + (index / (history.length - 1 || 1)) * graphWidth;
                    const y = paddingTop + graphHeight - ((point.networth - minValue) / range) * graphHeight;
                    return { x, y, ...point };
                  });
                  
                  // Create smooth path for line
                  const createSmoothPath = (points: Array<{ x: number; y: number }>) => {
                    if (points.length === 0) return '';
                    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
                    
                    let path = `M ${points[0].x} ${points[0].y}`;
                    for (let i = 1; i < points.length; i++) {
                      const prev = points[i - 1];
                      const curr = points[i];
                      const next = points[i + 1];
                      
                      if (i === 1) {
                        // First curve
                        const cp1x = prev.x + (curr.x - prev.x) / 3;
                        const cp1y = prev.y;
                        const cp2x = curr.x - (next ? (next.x - prev.x) / 6 : (curr.x - prev.x) / 3);
                        const cp2y = curr.y;
                        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                      } else if (i === points.length - 1) {
                        // Last curve
                        const cp1x = prev.x + (curr.x - prev.x) / 3;
                        const cp1y = prev.y;
                        const cp2x = curr.x - (curr.x - prev.x) / 3;
                        const cp2y = curr.y;
                        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                      } else {
                        // Middle curves
                        const cp1x = prev.x + (curr.x - prev.x) / 3;
                        const cp1y = prev.y;
                        const cp2x = curr.x - (next.x - prev.x) / 6;
                        const cp2y = curr.y;
                        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                      }
                    }
                    return path;
                  };
                  
                  // Create area path (line + bottom fill)
                  const areaPath = createSmoothPath(points) + 
                    ` L ${points[points.length - 1].x} ${paddingTop + graphHeight}` +
                    ` L ${points[0].x} ${paddingTop + graphHeight} Z`;
                  
                  return (
                    <View style={styles.networthGraphSection}>
                      <Text style={styles.networthSectionTitle}>Progress Over Time</Text>
                      <View style={styles.networthLineChartContainer}>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ width: chartWidth }}
                        >
                          <Svg width={chartWidth} height={chartHeight} style={styles.networthLineChartSvg}>
                            <Defs>
                              <SvgLinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <Stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                                <Stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
                              </SvgLinearGradient>
                            </Defs>
                            
                            {/* Grid lines */}
                            {yAxisLabels.map((value, index) => {
                              const y = paddingTop + graphHeight - ((value - minValue) / range) * graphHeight;
                              return (
                                <Line
                                  key={`grid-${index}`}
                                  x1={paddingLeft}
                                  y1={y}
                                  x2={paddingLeft + graphWidth}
                                  y2={y}
                                  stroke="#E5E7EB"
                                  strokeWidth="1"
                                  strokeDasharray="2,2"
                                  opacity={0.5}
                                />
                              );
                            })}
                            
                            {/* Area fill */}
                            <Path
                              d={areaPath}
                              fill="url(#areaGradient)"
                            />
                            
                            {/* Line */}
                            <Path
                              d={createSmoothPath(points)}
                              stroke="#10B981"
                              strokeWidth="3"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            
                            {/* Data points */}
                            {points.map((point, index) => {
                              const isSelected = selectedGraphYear === point.year;
                              return (
                                <Circle
                                  key={`point-${index}`}
                                  cx={point.x}
                                  cy={point.y}
                                  r={isSelected ? 6 : 4}
                                  fill={isSelected ? "#10B981" : "#FFFFFF"}
                                  stroke="#10B981"
                                  strokeWidth={isSelected ? 3 : 2}
                                  onPress={() => setSelectedGraphYear(isSelected ? null : point.year)}
                                />
                              );
                            })}
                            
                            {/* Y-axis labels */}
                            {yAxisLabels.map((value, index) => {
                              const y = paddingTop + graphHeight - ((value - minValue) / range) * graphHeight;
                              return (
                                <SvgText
                                  key={`y-label-${index}`}
                                  x={paddingLeft - 10}
                                  y={y + 4}
                                  fontSize="11"
                                  fill="#6B7280"
                                  textAnchor="end"
                                >
                                  {formatCurrency(value, currencyInfo)}
                                </SvgText>
                              );
                            })}
                            
                            {/* X-axis labels (years) */}
                            {points.map((point, index) => {
                              return (
                                <SvgText
                                  key={`x-label-${index}`}
                                  x={point.x}
                                  y={chartHeight - paddingBottom + 20}
                                  fontSize="11"
                                  fill="#6B7280"
                                  textAnchor="middle"
                                >
                                  {point.year}
                                </SvgText>
                              );
                            })}
                          </Svg>
                        </ScrollView>
                      </View>
                      {selectedGraphYear && (() => {
                        const selectedPoint = history.find(p => p.year === selectedGraphYear);
                        if (!selectedPoint) return null;
                        return (
                          <View style={styles.networthGraphInfo}>
                            <Text style={styles.networthGraphInfoText}>
                              {selectedGraphYear}: {currencyInfo.symbol}{Math.round(selectedPoint.networth).toLocaleString()}
                              {selectedPoint.delta !== undefined && selectedPoint.delta !== 0 && (
                                <Text style={{ color: selectedPoint.delta >= 0 ? '#10B981' : '#EF4444' }}>
                                  {' '}{selectedPoint.delta >= 0 ? '+' : ''}{currencyInfo.symbol}{Math.abs(selectedPoint.delta).toLocaleString()}
                                </Text>
                              )}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  );
                })() : (
                  <View style={styles.networthGraphSection}>
                    <Text style={styles.networthSectionTitle}>Progress Over Time</Text>
                    <Text style={styles.emptyBreakdownText}>No history available yet</Text>
                  </View>
                )}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradientContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingSafeArea: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  orbContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  orbOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  orbGradient: {
    width: '100%',
    height: '100%',
  },
  orbInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 6,
  },
  cubeShadowWrapper: {
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  loadingCubeIcon: {
    width: 60,
    height: 60,
    opacity: 0.9,
  },
  textContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Fonts.secondary.bold,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBlur: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 32,
    marginBottom: 16,
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 90,
    width: 90,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardLarge: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statCardChevron: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  variantsCard: {
    minWidth: 130, // Wider to fit large numbers with commas (e.g., 1,234,567)
    width: 130,
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: Fonts.secondary.bold,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },

  // Header & Year Selector
  headerContainer: {
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    zIndex: 10,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  yearSelectorContainer: {
    height: 60,
    marginTop: 8,
  },
  yearSelectorContent: {
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  yearItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    justifyContent: 'center',
  },
  connectorLine: {
    height: 2,
    backgroundColor: '#E5E7EB',
    flex: 1,
  },
  connectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    zIndex: 2,
  },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    minWidth: 60,
    alignItems: 'center',
  },
  yearPillSelected: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    fontFamily: Fonts.secondary.bold,
  },
  yearTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    fontFamily: Fonts.secondary.bold,
  },

  // Main Content
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 120,
  },
  identityCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 10,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: Fonts.secondary.bold,
  },
  avatarSection: {
    marginBottom: 16,
    position: 'relative',
  },
  avatarWrapper: {
    position: 'relative',
  },
  ageBadge: {
    position: 'absolute',
    right: -20,
    bottom: 0,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  ageBadgeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  ageBadgeValue: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
    fontFamily: Fonts.secondary.bold,
  },
  ageBadgeLabel: {
    color: '#696969',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: Fonts.secondary.bold,
  },
  roleSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    fontFamily: Fonts.secondary.bold,
  },
  progressStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 24,
    gap: 20,
  },
  biometricColumn: {
    flex: 1,
    gap: 8,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  biometricLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  biometricDelta: {
    fontSize: 14,
    fontWeight: '600',
  },
  biometricBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biometricBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  biometricBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  biometricValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    minWidth: 36,
    textAlign: 'right',
  },
  statCardsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  statCardHeaderCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  statCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statCardValueColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  statCardValueLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Fonts.secondary.bold,
  },
  statDeltaSmall: {
    fontSize: 13,
    fontWeight: '600',
  },
  netWorthContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexWrap: 'wrap',
  },
  
  // Life Log Expandable Section
  lifeLogSection: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  lifeLogButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  lifeLogButtonContent: {
    flex: 1,
  },
  lifeLogButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Fonts.secondary.bold,
    marginBottom: 4,
  },
  lifeLogButtonSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Fonts.secondary.bold,
  },
  lifeLogContent: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 20,
    paddingLeft: 36,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  questCard: {
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 24,
    paddingBottom: 32,
    position: 'relative',
    marginBottom: 8,
  },
  questHeader: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Fonts.secondary.bold,
    lineHeight: 22,
    flex: 1,
  },
  questTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    fontFamily: Fonts.secondary.bold,
    marginLeft: 12,
  },
  questDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 8,
  },
  questDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 16,
    width: '100%',
  },
  timelinePoint: {
    position: 'absolute',
    left: -6,
    top: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  emptyLogText: {
    color: Colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  peopleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  personTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  personTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    fontFamily: Fonts.secondary.bold,
  },
  
  // Bottom Action
  bottomActionContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  simulateButton: {
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  simulateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  relationshipModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  relationshipModalContent: {
    maxHeight: '80%',
    width: '90%',
    maxWidth: 500,
    minHeight: 300,
  },
  networthModalContent: {
    maxHeight: '90%',
    width: '90%',
    maxWidth: 500,
    minHeight: 500,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Fonts.secondary.bold,
  },
  modalClose: {
    padding: 4,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    marginBottom: 16,
    fontFamily: Fonts.secondary.bold,
  },
  lifeLogModalSubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 4,
    fontFamily: Fonts.secondary.bold,
  },
  scenarioInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  modalButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  relationshipsList: {
    marginTop: 8,
  },
  relationshipCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  relationshipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  relationshipName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  relationshipTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  relationshipTypeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  relationshipStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  relationshipDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  emptyEvents: {
    padding: 24,
    alignItems: 'center',
  },
  emptyEventsText: {
    color: Colors.textTertiary,
  },
  
  // Networth Modal Styles
  networthModalScroll: {
    flex: 1,
  },
  networthModalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  emptyBreakdownText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  networthCurrentSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20,
  },
  networthCurrentLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  networthCurrentValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    maxWidth: '100%',
  },
  networthBreakdownSection: {
    marginBottom: 24,
  },
  biggestMoverExplanation: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  biggestMoverText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    fontFamily: Fonts.secondary.bold,
  },
  biggestMoverLabel: {
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
  },
  biggestMoverDetail: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  networthSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    fontFamily: Fonts.secondary.bold,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
  },
  breakdownItemContent: {
    flex: 1,
  },
  breakdownSource: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  breakdownDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  networthGraphSection: {
    marginBottom: 20,
  },
  networthLineChartContainer: {
    height: 260,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  networthLineChartSvg: {
    backgroundColor: 'transparent',
  },
  networthGraphInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
  },
  networthGraphInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  networthGraphYear: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  networthGraphValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
    fontFamily: Fonts.secondary.bold,
  },
  networthGraphDelta: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
});

