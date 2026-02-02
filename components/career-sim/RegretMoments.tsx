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
  const safeRegretMoments = regretMoments || [];
  const safeReflection = reflection || 'A thoughtful reflection on the career path taken, acknowledging both wins and what might have been.';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Moments That Keep You Up</Text>
      <Text style={styles.subtitle}>The decisions you still think about</Text>
      
      <View style={styles.card}>
        {safeRegretMoments.length > 0 ? (
          safeRegretMoments.map((moment, index) => (
            <View key={index} style={styles.momentItem}>
              <View style={styles.momentHeader}>
                <Text style={styles.momentYear}>{moment.year ?? 2029}</Text>
                <Text style={styles.momentTitle}>- {moment.title ?? 'Missed Opportunity'}</Text>
              </View>
              <Text style={styles.momentDescription}>{moment.description ?? 'A moment you still think about.'}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No regret moments recorded.</Text>
        )}

        <View style={styles.reflectionBox}>
          <Text style={styles.reflectionTitle}>REFLECTION</Text>
          <Text style={styles.reflectionText}>{safeReflection}</Text>
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
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});
