import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { GitBranch } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import type { AlternatePath } from '@/lib/career-sim/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

interface ComparePathsSectionProps {
  alternatePaths: AlternatePath[];
  onPathPress: (path: AlternatePath) => void;
}

interface PathButtonProps {
  path: AlternatePath;
  onPress: () => void;
}

const PathButton = memo(({ path, onPress }: PathButtonProps) => (
  <TouchableOpacity
    style={styles.pathButton}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.pathHeader}>
      <View style={styles.pathBranchBadge}>
        <GitBranch size={14} color={Colors.textSecondary} strokeWidth={2.5} />
        <Text style={styles.pathBranchText}>
          {path.year ? `Branch at Year ${path.year}` : 'Alternate timeline'}
        </Text>
      </View>
    </View>
    <Text style={styles.pathText}>{path.label}</Text>
  </TouchableOpacity>
));

PathButton.displayName = 'PathButton';

function ComparePathsSectionComponent({ alternatePaths, onPathPress }: ComparePathsSectionProps) {
  const handlePathPress = useCallback((path: AlternatePath) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPathPress(path);
  }, [onPathPress]);

  const safePaths = alternatePaths || [
    { id: 'stay-current', label: 'Stay at Current' },
    { id: 'switch-faang', label: 'Switch to FAANG' },
    { id: 'startup-cto', label: 'Startup CTO' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <GitBranch size={20} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
        <Text style={styles.sectionTitle}>Explore different timelines</Text>
      </View>
      <Text style={styles.sectionDesc}>What happens if you made different choices at key moments?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
      >
        {safePaths.map((path) => (
          <PathButton
            key={path.id}
            path={path}
            onPress={() => handlePathPress(path)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export const ComparePathsSection = memo(ComparePathsSectionComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.primary.regular,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginBottom: 12,
  },
  scrollView: {
    marginHorizontal: -24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  pathButton: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pathBranchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pathBranchText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.semibold,
  },
  pathText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.semibold,
    lineHeight: 24,
  },
});
