import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { Tradeoffs } from '@/lib/career-sim/types';

interface RealityCheckSectionProps {
  tradeoffs: Tradeoffs;
}

function RealityCheckSectionComponent({ tradeoffs }: RealityCheckSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Reality Check</Text>
      <View style={styles.columns}>
        {/* Pros Column */}
        <View style={[styles.column, styles.proColumn]}>
          <View style={styles.columnHeader}>
            <View style={styles.proIconContainer}>
              <ArrowUpRight size={18} color="#10B981" strokeWidth={3} />
            </View>
            <Text style={styles.columnTitle}>THE UPSIDE</Text>
          </View>
          <View style={styles.itemsList}>
            {tradeoffs.pros.map((pro, index) => (
              <View key={index} style={styles.item}>
                <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} style={styles.itemIcon} />
                <Text style={styles.itemText}>{pro}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cons Column */}
        <View style={[styles.column, styles.conColumn]}>
          <View style={styles.columnHeader}>
            <View style={styles.conIconContainer}>
              <ArrowDownRight size={18} color="#EF4444" strokeWidth={3} />
            </View>
            <Text style={styles.columnTitle}>THE RISKS</Text>
          </View>
          <View style={styles.itemsList}>
            {tradeoffs.cons.map((con, index) => (
              <View key={index} style={styles.item}>
                <XCircle size={14} color="#EF4444" strokeWidth={2.5} style={styles.itemIcon} />
                <Text style={styles.itemText}>{con}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export const RealityCheckSection = memo(RealityCheckSectionComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary.regular,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
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
  proColumn: {
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  conColumn: {
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  proIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
  },
  itemsList: {
    gap: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemIcon: {
    marginTop: 2,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.semibold,
    lineHeight: 18,
    fontWeight: '600',
  },
});
