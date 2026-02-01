import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { GlobalComparison as GlobalComparisonType } from '@/lib/career-sim/types';
import { Trophy, TrendingUp, Clock, DollarSign } from 'lucide-react-native';

interface GlobalComparisonProps {
  globalComparison: GlobalComparisonType;
}

function GlobalComparisonComponent({ globalComparison }: GlobalComparisonProps) {
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>How You Compare Globally</Text>
      <Text style={styles.subtitle}>Based on engineers who started in 2026 worldwide</Text>
      
      <View style={styles.card}>
        {/* Income Percentile */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionLabel}>Income Percentile</Text>
            <View style={styles.percentileBadge}>
              <Trophy size={12} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.percentileText}>Top {globalComparison.income.globalPercentile}%</Text>
            </View>
          </View>
          
          <View style={styles.mainStat}>
            <Text style={styles.mainStatLabel}>Your Compensation</Text>
            <Text style={styles.mainStatValue}>{formatCurrency(globalComparison.income.yourComp)}</Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Global Avg</Text>
              <Text style={styles.gridValue}>{formatCurrency(globalComparison.income.globalAverage)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>US Avg</Text>
              <Text style={styles.gridValue}>{formatCurrency(globalComparison.income.usAverage)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Top Earners</Text>
              <Text style={styles.gridValue}>{globalComparison.income.topEarners.range}</Text>
            </View>
          </View>
        </View>

        {/* Career Progression */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionLabel}>Career Progression</Text>
            <View style={styles.percentileBadge}>
              <Trophy size={12} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.percentileText}>Top {globalComparison.careerProgression.globalPercentile}%</Text>
            </View>
          </View>

          <View style={styles.mainStat}>
            <Text style={styles.mainStatLabel}>Your Level</Text>
            <Text style={styles.mainStatValue}>{globalComparison.careerProgression.yourLevel}</Text>
          </View>

          <View style={styles.listContainer}>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Most common:</Text>
              <Text style={styles.listValue}>{globalComparison.careerProgression.mostCommon}</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Fastest:</Text>
              <Text style={styles.listValue}>{globalComparison.careerProgression.fastest}</Text>
            </View>
          </View>
        </View>

        {/* Work-Life Balance */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionLabel}>Work-Life Balance</Text>
            <View style={[styles.percentileBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Text style={[styles.percentileText, { color: '#F59E0B' }]}>Middle {globalComparison.workLife.globalPercentile}%</Text>
            </View>
          </View>

          <View style={styles.mainStat}>
            <Text style={styles.mainStatLabel}>Your Hours</Text>
            <Text style={styles.mainStatValue}>{globalComparison.workLife.yourHours} hrs/week</Text>
          </View>

          <Text style={styles.contextText}>
            Global range: {globalComparison.workLife.range.min}-{globalComparison.workLife.range.max} hrs
          </Text>
        </View>

        {/* Equity/Wealth */}
        <View style={styles.lastSection}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionLabel}>Equity & Wealth</Text>
            <View style={[styles.percentileBadge, { backgroundColor: 'rgba(79, 172, 254, 0.1)', borderColor: 'rgba(79, 172, 254, 0.2)' }]}>
              <TrendingUp size={12} color="#4facfe" strokeWidth={2.5} />
              <Text style={[styles.percentileText, { color: '#4facfe' }]}>Top {globalComparison.equity.globalPercentile}%</Text>
            </View>
          </View>

          <View style={styles.mainStat}>
            <Text style={styles.mainStatLabel}>Vested Equity</Text>
            <Text style={styles.mainStatValue}>{formatCurrency(globalComparison.equity.yourEquity)}</Text>
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{globalComparison.equity.note}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export const GlobalComparison = memo(GlobalComparisonComponent);

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
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  lastSection: {
    marginBottom: 0,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  percentileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  percentileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: Fonts.secondary.bold,
  },
  mainStat: {
    marginBottom: 16,
  },
  mainStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginBottom: 2,
  },
  mainStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.regular,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.semibold,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  listValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.semibold,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  contextText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  noteBox: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 12,
  },
  noteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    fontStyle: 'italic',
  },
});