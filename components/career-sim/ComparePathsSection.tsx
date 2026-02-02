import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GitBranch } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import type { AlternatePath } from '@/lib/career-sim/types';

interface ComparePathsSectionProps {
  alternatePaths: AlternatePath[];
  onPathPress: (pathId: string) => void;
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
    <Text style={styles.pathText}>{path.label}</Text>
  </TouchableOpacity>
));

PathButton.displayName = 'PathButton';

function ComparePathsSectionComponent({ alternatePaths, onPathPress }: ComparePathsSectionProps) {
  const handlePathPress = useCallback((pathId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPathPress(pathId);
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
        <Text style={styles.sectionTitle}>Want to see what changes if you...</Text>
      </View>
      <View style={styles.pathsContainer}>
        {safePaths.map((path) => (
          <PathButton
            key={path.id}
            path={path}
            onPress={() => handlePathPress(path.id)}
          />
        ))}
      </View>
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
  pathsContainer: {
    gap: 12,
  },
  pathButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  pathText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.semibold,
  },
});
