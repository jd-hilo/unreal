import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Image, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { Briefcase, ChevronRight, Heart, Brain, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';


const { width } = Dimensions.get('window');

const CARDS = [
  {
    id: 'career',
    title: 'Simulate Your\nCareer',
    subtitle: 'Clone your digital twin millions of times to find the highest probable lifeline.',
    icon: Briefcase,
    gradient: ['rgba(255, 20, 147, 0.1)', 'rgba(139, 92, 246, 0.1)'],
    iconColor: '#8B5CF6',
    action: '/career-sim/setup',
    type: 'active',
    buttonText: 'Start Simulation'
  },
  {
    id: 'relationships',
    title: 'Simulate your Relationship',
    subtitle: 'Clone your digital twin millions of times to find the highest probable lifeline.',
    icon: Heart,
    gradient: ['rgba(239, 68, 68, 0.1)', 'rgba(236, 72, 153, 0.1)'],
    iconColor: '#EC4899',
    type: 'coming_soon',
    buttonText: 'Coming Soon'
  },
  {
    id: 'decisions',
    title: 'Simulate your Social\nLife',
    subtitle: 'Clone your digital twin millions of times to find the highest probable lifeline.',
    icon: Brain,
    gradient: ['rgba(59, 130, 246, 0.1)', 'rgba(147, 51, 234, 0.1)'],
    iconColor: '#3B82F6',
    type: 'coming_soon',
    buttonText: 'Coming Soon'
  }
];

export default function SimulateTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuth((state) => state.user);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Fade in animation
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }).start();
    }, [fadeAnim])
  );

  const handleCardPress = useCallback((card: typeof CARDS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (card.type === 'active' && card.action) {
      // Redirect to the first step of the multi-page flow
      router.push('/career-sim/01-time-horizon');
    }
  }, [router]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
      Haptics.selectionAsync();
    }
  };

  const renderCard = (card: typeof CARDS[0], index: number) => {
    const Icon = card.icon;
    return (
      <View key={card.id} style={styles.cardWrapper}>
        <TouchableOpacity
          onPress={() => handleCardPress(card)}
          activeOpacity={0.9}
          style={styles.cardContainer}
          disabled={card.type === 'coming_soon'}
        >
          {/* 3D Edge Effect - Top */}
          <View style={styles.cardEdgeTop} />
          {/* 3D Edge Effect - Left */}
          <View style={styles.cardEdgeLeft} />
          {/* 3D Edge Effect - Right */}
          <View style={styles.cardEdgeRight} />
          {/* 3D Edge Effect - Bottom */}
          <View style={styles.cardEdgeBottom} />
          
          <View style={styles.cardInner}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F7FF']}
              style={styles.cardBackground}
            />
            
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={card.gradient}
                  style={styles.iconGradient}
                >
                  <Icon size={32} color={card.iconColor} strokeWidth={2.5} />
                </LinearGradient>
              </View>
              
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>

              <View style={styles.actionRow}>
                <Text style={[styles.actionText, card.type === 'coming_soon' && styles.disabledText]}>
                  {card.buttonText}
                </Text>
                <View style={[styles.actionButton, card.type === 'coming_soon' && styles.disabledButton]}>
                  <ChevronRight size={20} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View 
          style={[styles.container, { opacity: fadeAnim }]} 
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Zap size={32} color={Colors.textPrimary} strokeWidth={2} />
              <Text style={styles.title}>Simulate</Text>
            </View>
            <Text style={styles.subtitle}>Experience possible futures</Text>
          </View>

          {/* Carousel */}
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.carouselContent}
            >
              {CARDS.map((card, index) => renderCard(card, index))}
            </ScrollView>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
              {CARDS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeIndex ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
          </View>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  safeArea: { 
    flex: 1 
  },
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: { 
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  title: { 
    fontSize: 32, 
    fontFamily: Fonts.primary.regular, 
    color: Colors.textPrimary 
  },
  subtitle: { 
    fontSize: 16, 
    color: Colors.textSecondary, 
    fontFamily: Fonts.secondary.regular,
  },
  carouselContainer: {
    flex: 1,
    paddingBottom: 24,
    marginTop: -20,
  },
  carouselContent: {
    alignItems: 'center',
  },
  cardWrapper: {
    width: width,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    position: 'relative',
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    height: 500, // Fixed height for consistency
  },
  // 3D Edge Effects
  cardEdgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    zIndex: 10,
  },
  cardEdgeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopLeftRadius: 40,
    borderBottomLeftRadius: 40,
    zIndex: 10,
  },
  cardEdgeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderTopRightRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 10,
  },
  cardEdgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 10,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    overflow: 'hidden',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    padding: 32,
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  iconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: Fonts.secondary.regular,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  actionText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledText: {
    color: Colors.textSecondary,
    opacity: 0.6,
  },
  disabledButton: {
    backgroundColor: '#E5E5EA',
    shadowOpacity: 0,
    elevation: 0,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#1a1a1a',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#E5E5EA',
  },
});
