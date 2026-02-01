import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { SocietalImpact as SocietalImpactType } from '@/lib/career-sim/types';
import { Rocket, Users, Award, Zap } from 'lucide-react-native';

interface SocietalImpactProps {
  societalImpact: SocietalImpactType;
}

function SocietalImpactComponent({ societalImpact }: SocietalImpactProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Societal Impact</Text>
      <Text style={styles.subtitle}>2026-2040</Text>
      
      <View style={styles.card}>
        {/* Products Shipped */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Rocket size={20} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
            <Text style={styles.sectionLabel}>Products You Shipped</Text>
          </View>
          {societalImpact.productsShipped.map((product, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>→</Text>
              <Text style={styles.bulletText}>{product}</Text>
            </View>
          ))}
        </View>

        {/* People Influenced */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={Colors.gradients.turquoise[0]} strokeWidth={2.5} />
            <Text style={styles.sectionLabel}>People You Influenced</Text>
          </View>
          {societalImpact.peopleInfluenced.map((item, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>→</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Industry Contributions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color="#FF9A8B" strokeWidth={2.5} />
            <Text style={styles.sectionLabel}>Industry Contributions</Text>
          </View>
          {societalImpact.industryContributions.map((contribution, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>→</Text>
              <Text style={styles.bulletText}>{contribution}</Text>
            </View>
          ))}
        </View>

        {/* Ripple Effect */}
        <View style={styles.rippleBox}>
          <View style={styles.rippleHeader}>
            <Zap size={18} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
            <Text style={styles.rippleTitle}>The Ripple Effect</Text>
          </View>
          <Text style={styles.rippleText}>{societalImpact.rippleEffect}</Text>
        </View>

        {/* Honest Assessment */}
        <View style={styles.honestBox}>
          <Text style={styles.honestTitle}>The Honest Assessment</Text>
          <Text style={styles.honestText}>{societalImpact.honestAssessment}</Text>
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.3,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.bold,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 20,
  },
  rippleBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  rippleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rippleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  rippleText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 22,
  },
  honestBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
  },
  honestTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  honestText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 22,
  },
});
