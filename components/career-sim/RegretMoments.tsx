import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { RegretMoment } from '@/lib/career-sim/types';
import { Brain } from 'lucide-react-native';

interface RegretMomentsProps {
  regretMoments: RegretMoment[];
  reflection: string;
}

function RegretMomentsComponent({ regretMoments, reflection }: RegretMomentsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Moments That Keep You Up</Text>
      <Text style={styles.subtitle}>The decisions you still think about</Text>
      
      <View style={styles.card}>
        {regretMoments.map((moment, index) => (
          <View key={index} style={styles.momentItem}>
            <View style={styles.momentHeader}>
              <Text style={styles.momentYear}>{moment.year}</Text>
              <Text style={styles.momentTitle}>- {moment.title}</Text>
            </View>
            <Text style={styles.momentDescription}>{moment.description}</Text>
          </View>
        ))}

        <View style={styles.reflectionBox}>
          <Text style={styles.reflectionTitle}>REFLECTION</Text>
          <Text style={styles.reflectionText}>{reflection}</Text>
        </View>
      </View>
    </View>
  );
}

export const RegretMoments = memo(RegretMomentsComponent);

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
  momentItem: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  momentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  momentYear: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.bold,
  },
  momentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  momentDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 20,
  },
  reflectionBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
  },
  reflectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  reflectionText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 22,
  },
});
