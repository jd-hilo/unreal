import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign, TrendingUp, Clock, Zap, Target, Users, Shield, Award } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { CareerStats } from '@/lib/career-sim/types';
import { LinearGradient } from 'expo-linear-gradient';

interface CareerStatsGridProps {
  stats: CareerStats;
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  items: { label: string; value: string; icon?: React.ReactNode }[];
  gradient: readonly string[];
}

const StatCard = memo(({ icon, title, items, gradient }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={styles.statHeader}>
      <LinearGradient
        colors={gradient}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {icon}
      </LinearGradient>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <View style={styles.statContent}>
      {items.map((item, index) => (
        <View key={index} style={styles.statItem}>
          <View style={styles.statLabelRow}>
            {item.icon}
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
          <Text style={styles.statValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  </View>
));

StatCard.displayName = 'StatCard';

function CareerStatsGridComponent({ stats }: CareerStatsGridProps) {
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Performance Metrics</Text>
      <View style={styles.grid}>
        <StatCard
          gradient={Colors.gradients.purple}
          icon={<DollarSign size={20} color="#FFFFFF" strokeWidth={2.5} />}
          title="Earnings"
          items={[
            { label: 'Base', value: formatCurrency(stats.compensation.base) },
            { label: 'Equity', value: formatCurrency(stats.compensation.equity) },
          ]}
        />
        
        <StatCard
          gradient={Colors.gradients.turquoise}
          icon={<TrendingUp size={20} color="#FFFFFF" strokeWidth={2.5} />}
          title="Velocity"
          items={[
            { label: 'Promos', value: `${stats.growth.promotions}x`, icon: <Target size={12} color={Colors.textTertiary} /> },
            { label: 'Team', value: stats.growth.teamSize > 0 ? `${stats.growth.teamSize}` : 'IC', icon: <Users size={12} color={Colors.textTertiary} /> },
          ]}
        />
        
        <StatCard
          gradient={['#FF9A8B', '#FF6A88']}
          icon={<Clock size={20} color="#FFFFFF" strokeWidth={2.5} />}
          title="Balance"
          items={[
            { label: 'Burnout', value: stats.workLife.burnoutRisk, icon: <Shield size={12} color={Colors.textTertiary} /> },
            { label: 'Flex', value: stats.workLife.flexibility, icon: <Zap size={12} color={Colors.textTertiary} /> },
          ]}
        />
        
        <StatCard
          gradient={['#4facfe', '#00f2fe']}
          icon={<Award size={20} color="#FFFFFF" strokeWidth={2.5} />}
          title="Expertise"
          items={[
            { label: 'Tech', value: stats.skills.technical.split(',')[0].trim() },
            { label: 'Lead', value: stats.skills.leadership.split(',')[0].trim() },
          ]}
        />
      </View>
    </View>
  );
}

export const CareerStatsGrid = memo(CareerStatsGridComponent);

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48.2%',
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
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statContent: {
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.semibold,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
});
