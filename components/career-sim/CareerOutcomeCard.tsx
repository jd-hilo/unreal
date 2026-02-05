import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MapPin, Star, Briefcase, Building2, DollarSign, Lock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Colors, Fonts } from '@/constants/Theme';
import type { CareerOutcome } from '@/lib/career-sim/types';

interface CareerOutcomeCardProps {
  outcome: CareerOutcome;
  isPremium?: boolean;
  router?: { push: (path: any) => void };
}

function CareerOutcomeCardComponent({ outcome, isPremium = true, router }: CareerOutcomeCardProps) {
  // Provide safe defaults
  const safeOutcome = outcome || {
    title: 'Senior Role',
    company: 'Tech Company',
    totalComp: 200000,
    location: 'San Francisco, CA',
    satisfaction: 4.0,
  };

  const formatCompensation = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} size={14} color="#FFD700" fill="#FFD700" strokeWidth={2} />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} size={14} color="#FFD700" fill="rgba(255, 215, 0, 0.5)" strokeWidth={2} />
        );
      } else {
        stars.push(
          <Star key={i} size={14} color="rgba(255, 215, 0, 0.3)" fill="none" strokeWidth={2} />
        );
      }
    }
    return stars;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.label}>Career Outcome</Text>
      </View>
      
      <Text style={styles.title}>{safeOutcome.title}</Text>
      
      <View style={styles.companyRow}>
        <Building2 size={18} color={Colors.textSecondary} strokeWidth={2} />
        <Text style={styles.company}>{safeOutcome.company}</Text>
      </View>

      <View style={styles.compensationContainer}>
        <View style={styles.compHeaderRow}>
          <Text style={styles.compLabel}>Total Compensation</Text>
          <View style={styles.marketBadge}>
            <Text style={styles.marketText}>+12% vs Market</Text>
          </View>
        </View>
        
        <View style={styles.compAmountContainer}>
          <Text style={styles.compAmount}>{formatCompensation(safeOutcome.totalComp)}</Text>
          {!isPremium && (
            <TouchableOpacity 
              style={styles.compAmountBlur}
              onPress={() => router?.push('/premium')}
              activeOpacity={1}
            >
              <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}>
                <View style={styles.blurContent}>
                  <Lock size={16} color={Colors.textSecondary} strokeWidth={2.5} />
                  <Text style={styles.blurText}>Reveal with mora+</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MapPin size={14} color={Colors.textTertiary} strokeWidth={2} />
            <Text style={styles.detailText}>{safeOutcome.location}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export const CareerOutcomeCard = memo(CareerOutcomeCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    paddingTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: 20,
    height: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 12,
    lineHeight: 38,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  company: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  compensationContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
  },
  compHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  satisfactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  satisfactionText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  compAmountContainer: {
    position: 'relative',
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 16,
  },
  compAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -1,
    lineHeight: 54,
  },
  compAmountBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    zIndex: 10,
  },
  blurContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  blurText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  marketBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  marketText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.2,
  },
});
