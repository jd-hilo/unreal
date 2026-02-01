import React, { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';

interface DayInLifeCardProps {
  dayInLife: string;
}

function DayInLifeCardComponent({ dayInLife }: DayInLifeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const truncatedText = dayInLife.length > 150 ? `${dayInLife.substring(0, 150)}...` : dayInLife;
  const needsExpansion = dayInLife.length > 150;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Calendar size={20} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
        <Text style={styles.sectionTitle}>A Day in Your Life</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.text}>
          {expanded ? dayInLife : truncatedText}
        </Text>
        {needsExpansion && (
          <TouchableOpacity onPress={handleToggle} style={styles.expandButton}>
            <Text style={styles.expandText}>
              {expanded ? 'Read less' : 'Read more'}
            </Text>
            {expanded ? (
              <ChevronUp size={16} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
            ) : (
              <ChevronDown size={16} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export const DayInLifeCard = memo(DayInLifeCardComponent);

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
  },
  text: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 24,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.semibold,
  },
});
