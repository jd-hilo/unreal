import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { GitBranch, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import type { AlternatePath } from '@/lib/career-sim/types';
import { useCareerSimCooldown } from '@/hooks/useCareerSimCooldown';
import { useTwin } from '@/store/useTwin';

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

const PathButton = memo(({ path, onPress, isDisabled, timerText, router }: PathButtonProps & { isDisabled?: boolean; timerText?: string | null; router?: { push: (path: any) => void } }) => (
  <TouchableOpacity
    style={[styles.pathButton, isDisabled && styles.pathButtonDisabled]}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={isDisabled}
  >
    <View style={styles.pathHeader}>
      <View style={styles.pathBranchBadge}>
        <GitBranch size={14} color={Colors.textSecondary} strokeWidth={2.5} />
        <Text style={styles.pathBranchText}>
          {path.year ? `Branch at Year ${path.year}` : 'Alternate timeline'}
        </Text>
      </View>
    </View>
    <Text style={styles.pathText}>{path.label.replace(/\([^)]*\)/g, '').trim()}</Text>
    {isDisabled && timerText && (
      <View style={styles.timerContainer}>
        <View style={styles.timerTextContainer}>
          <Text style={styles.timerText}>{timerText}</Text>
          <TouchableOpacity 
            onPress={() => router?.push('/premium')}
            activeOpacity={0.7}
          >
            <Text style={styles.timerSubtext}>
              until next sim. Upgrade to mora+ for unlimited sims.
            </Text>
          </TouchableOpacity>
        </View>
        <ChevronRight size={16} color={Colors.textTertiary} strokeWidth={2.5} />
      </View>
    )}
  </TouchableOpacity>
));

PathButton.displayName = 'PathButton';

function ComparePathsSectionComponent({ alternatePaths, onPathPress }: ComparePathsSectionProps) {
  const router = useRouter();
  const { isPremium } = useTwin();
  const { isOnCooldown, formattedTime } = useCareerSimCooldown();
  
  const handlePathPress = useCallback((path: AlternatePath) => {
    if (!isPremium && isOnCooldown) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPathPress(path);
  }, [onPathPress, isPremium, isOnCooldown]);

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
            isDisabled={!isPremium && isOnCooldown}
            timerText={!isPremium && isOnCooldown ? formattedTime : null}
            router={router}
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
  pathButtonDisabled: {
    opacity: 0.6,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  timerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 2,
  },
  timerSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.regular,
    lineHeight: 14,
  },
});
