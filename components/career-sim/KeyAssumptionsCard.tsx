import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { Assumption } from '@/lib/career-sim/types';

interface KeyAssumptionsCardProps {
  assumptions: Assumption[];
}

interface AssumptionItemProps {
  assumption: Assumption;
}

const AssumptionItem = memo(({ assumption }: AssumptionItemProps) => {
  const getIconColor = (icon: string) => {
    switch (icon) {
      case '✓':
        return '#10B981';
      case '⚠️':
        return '#F59E0B';
      case '❌':
        return '#EF4444';
      default:
        return Colors.textSecondary;
    }
  };

  const getBackgroundColor = (icon: string) => {
    switch (icon) {
      case '✓':
        return 'rgba(16, 185, 129, 0.1)';
      case '⚠️':
        return 'rgba(245, 158, 11, 0.1)';
      case '❌':
        return 'rgba(239, 68, 68, 0.1)';
      default:
        return 'rgba(0,0,0,0.03)';
    }
  };

  return (
    <View style={styles.assumptionItem}>
      <View style={[styles.iconBadge, { backgroundColor: getBackgroundColor(assumption.icon) }]}>
        <Text style={[styles.iconText, { color: getIconColor(assumption.icon) }]}>
          {assumption.icon}
        </Text>
      </View>
      <View style={styles.assumptionContent}>
        <Text style={styles.assumptionText}>{assumption.text}</Text>
        <Text style={styles.likelihoodText}>{assumption.likelihood}% likelihood</Text>
      </View>
    </View>
  );
});

AssumptionItem.displayName = 'AssumptionItem';

function KeyAssumptionsCardComponent({ assumptions }: KeyAssumptionsCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AlertCircle size={20} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
        <Text style={styles.sectionTitle}>Key Assumptions</Text>
      </View>
      <View style={styles.card}>
        {assumptions.map((assumption, index) => (
          <AssumptionItem key={index} assumption={assumption} />
        ))}
      </View>
    </View>
  );
}

export const KeyAssumptionsCard = memo(KeyAssumptionsCardComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary.regular,
    fontWeight: '600',
    color: Colors.textPrimary,
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
    gap: 12,
  },
  assumptionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  assumptionContent: {
    flex: 1,
    paddingTop: 2,
  },
  assumptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 20,
    marginBottom: 2,
  },
  likelihoodText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
});
