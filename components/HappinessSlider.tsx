import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

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
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 20,
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.2)',
  },
  sliderButtonSelected: {
    backgroundColor: 'rgba(135, 206, 250, 0.3)',
    borderColor: 'rgba(135, 206, 250, 0.8)',
    borderWidth: 2,
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
    color: 'rgba(255, 255, 255, 0.6)',
  },
  sliderTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  endLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

