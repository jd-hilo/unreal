import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { SocietalImpact as SocietalImpactType } from '@/lib/career-sim/types';
import { Rocket, Users, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SocietalImpactProps {
  societalImpact: SocietalImpactType;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

function SocietalImpactComponent({ societalImpact }: SocietalImpactProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Your Societal Impact</Text>
        <Text style={styles.subtitle}>2026-2040</Text>
      </View>
      
      {/* Horizontal Scroll for Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 16}
        style={styles.scrollView}
      >
        {/* Products Card */}
        <View style={styles.impactCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Rocket size={20} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
            </View>
            <Text style={styles.cardTitle}>Products Shipped</Text>
          </View>
          <View style={styles.listContainer}>
            {societalImpact.productsShipped.map((product, index) => (
              <View key={index} style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: Colors.gradients.purple[1] }]} />
                <Text style={styles.bulletText}>{product}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* People Card */}
        <View style={styles.impactCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Users size={20} color={Colors.gradients.turquoise[0]} strokeWidth={2.5} />
            </View>
            <Text style={styles.cardTitle}>People Influenced</Text>
          </View>
          <View style={styles.listContainer}>
            {societalImpact.peopleInfluenced.map((item, index) => (
              <View key={index} style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: Colors.gradients.turquoise[0] }]} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Industry Card */}
        <View style={styles.impactCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 154, 139, 0.1)' }]}>
              <Award size={20} color="#FF9A8B" strokeWidth={2.5} />
            </View>
            <Text style={styles.cardTitle}>Industry Mark</Text>
          </View>
          <View style={styles.listContainer}>
            {societalImpact.industryContributions.map((contribution, index) => (
              <View key={index} style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: '#FF9A8B' }]} />
                <Text style={styles.bulletText}>{contribution}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Narrative Section */}
      <View style={styles.narrativeContainer}>
        {/* Ripple Effect */}
        <View style={styles.narrativeCard}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.05)', 'rgba(139, 92, 246, 0.02)']}
            style={styles.narrativeGradient}
          >
            <Text style={styles.narrativeTitle}>The Ripple Effect</Text>
            <Text style={styles.narrativeText}>{societalImpact.rippleEffect}</Text>
          </LinearGradient>
        </View>

        {/* Honest Assessment */}
        <View style={styles.narrativeCard}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.05)', 'rgba(245, 158, 11, 0.02)']}
            style={styles.narrativeGradient}
          >
            <Text style={[styles.narrativeTitle, { color: '#F59E0B' }]}>What changes if you...</Text>
            <Text style={styles.narrativeText}>{societalImpact.honestAssessment}</Text>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

export const SocietalImpact = memo(SocietalImpactComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  headerContainer: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary.regular,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  scrollView: {
    marginHorizontal: -24,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  impactCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  listContainer: {
    gap: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 20,
  },
  narrativeContainer: {
    gap: 16,
  },
  narrativeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  narrativeGradient: {
    padding: 20,
  },
  narrativeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  narrativeText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 22,
  },
});
