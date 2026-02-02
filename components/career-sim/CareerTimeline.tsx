import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { TimelineNode } from '@/lib/career-sim/types';
import { LinearGradient } from 'expo-linear-gradient';

interface CareerTimelineProps {
  timeline: { milestones: TimelineNode[] };
}

interface TimelineNodeComponentProps {
  node: TimelineNode;
  isLast: boolean;
  index: number;
}

const TimelineNodeComponent = memo(({ node, isLast, index }: TimelineNodeComponentProps) => {
  const formatSalary = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <View style={styles.nodeContainer}>
      <View style={styles.nodeLeft}>
        <LinearGradient
          colors={Colors.gradients.purple}
          style={styles.nodeDotGradient}
        >
          <View style={styles.nodeDotInner} />
        </LinearGradient>
        {!isLast && <View style={styles.nodeLine} />}
      </View>
      <View style={[styles.nodeContent, index === 0 && styles.nodeContentFirst]}>
      <View style={styles.nodeHeader}>
        <Text style={styles.nodeYear}>Year {node.year}</Text>
        <View style={styles.salaryBadge}>
          <Text style={styles.nodeSalary}>{formatSalary(node.salary)}</Text>
        </View>
      </View>
        <Text style={styles.nodeTitle}>{node.title}</Text>
        <Text style={styles.nodeCompany}>{node.company}</Text>
        {node.description && (
          <Text style={styles.nodeDescription}>{node.description}</Text>
        )}
      </View>
    </View>
  );
});

TimelineNodeComponent.displayName = 'TimelineNodeComponent';

function CareerTimelineComponent({ timeline }: CareerTimelineProps) {
  const milestones = timeline?.milestones || [];
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Career Journey</Text>
      <View style={styles.timelineContainer}>
        {milestones.length > 0 ? (
          milestones.map((node, index) => (
            <TimelineNodeComponent
              key={`${node.year}-${index}`}
              node={node}
              isLast={index === milestones.length - 1}
              index={index}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>Timeline data is being generated...</Text>
        )}
      </View>
    </View>
  );
}

export const CareerTimeline = memo(CareerTimelineComponent);

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
  timelineContainer: {
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
  nodeContainer: {
    flexDirection: 'row',
    minHeight: 100,
  },
  nodeLeft: {
    alignItems: 'center',
    marginRight: 20,
    width: 24,
  },
  nodeDotGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  nodeLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 4,
  },
  nodeContent: {
    flex: 1,
    paddingBottom: 32,
  },
  nodeContentFirst: {
    // Extra styling for first node if needed
  },
  nodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nodeYear: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.bold,
  },
  salaryBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nodeSalary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: Fonts.secondary.bold,
  },
  nodeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 4,
  },
  nodeCompany: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.semibold,
    marginBottom: 6,
  },
  nodeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
    padding: 20,
  },
});
