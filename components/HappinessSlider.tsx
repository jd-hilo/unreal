import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

interface HappinessSliderProps {
  value: number | null;
  onValueChange: (value: number) => void;
  label?: string;
}

export function HappinessSlider({ value, onValueChange, label }: HappinessSliderProps) {
  const [selectedValue, setSelectedValue] = useState<number | null>(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  function handleSelect(val: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedValue(val);
    onValueChange(val);
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.sliderContainer}>
        {Array.from({ length: 11 }, (_, i) => i).map((num) => {
          const isSelected = selectedValue === num;
          return (
            <TouchableOpacity
              key={num}
              style={[
                styles.sliderButton,
                isSelected && styles.sliderButtonSelected,
                num === 0 && styles.firstButton,
                num === 10 && styles.lastButton,
              ]}
              onPress={() => handleSelect(num)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sliderText, isSelected && styles.sliderTextSelected]}>
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.labelsContainer}>
        <Text style={styles.endLabel}>Not happy</Text>
        <Text style={styles.endLabel}>Very happy</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: Fonts.secondary.bold,
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  sliderButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sliderButtonSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.gradients.turquoise[1],
    borderWidth: 2,
    shadowColor: Colors.gradients.turquoise[1],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  firstButton: {
    marginLeft: 0,
  },
  lastButton: {
    marginRight: 0,
  },
  sliderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  sliderTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  endLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
});

