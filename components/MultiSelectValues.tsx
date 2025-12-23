import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Input } from './Input';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

const VALUES = [
  'Freedom',
  'Growth',
  'Family',
  'Security',
  'Creativity',
  'Adventure',
  'Stability',
  'Relationships',
  'Achievement',
  'Health',
  'Learning',
  'Independence',
  'Community',
  'Purpose',
  'Balance',
  'Authenticity',
  'Success',
  'Peace',
  'Challenge',
  'Contribution',
];

interface MultiSelectValuesProps {
  selectedValues: string[];
  onToggleValue: (value: string) => void;
  additionalContext?: string;
  onAdditionalContextChange?: (value: string) => void;
}

export function MultiSelectValues({
  selectedValues,
  onToggleValue,
  additionalContext = '',
  onAdditionalContextChange,
}: MultiSelectValuesProps) {
  function handleValuePress(value: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleValue(value);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        Select all that apply. You can choose multiple values.
      </Text>
      
      <ScrollView 
        style={styles.valuesContainer}
        contentContainerStyle={styles.valuesContent}
        showsVerticalScrollIndicator={false}
      >
        {VALUES.map((value, index) => {
          const isSelected = selectedValues.includes(value);
          return (
            <TouchableOpacity
              key={index}
              style={[styles.valueChip, isSelected && styles.valueChipSelected]}
              onPress={() => handleValuePress(value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.valueText, isSelected && styles.valueTextSelected]}>
                {value}
              </Text>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {onAdditionalContextChange && (
        <View style={styles.contextContainer}>
          <Input
            placeholder="Please provide additional context (optional)"
            value={additionalContext}
            onChangeText={onAdditionalContextChange}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            containerStyle={styles.contextInput}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instruction: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  valuesContainer: {
    flex: 1,
    maxHeight: 400,
  },
  valuesContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 20,
  },
  valueChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  valueChipSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.gradients.turquoise[1],
    borderWidth: 2,
    shadowColor: Colors.gradients.turquoise[1],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    lineHeight: 18,
    fontFamily: Fonts.secondary.bold,
  },
  valueTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.gradients.turquoise[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  contextContainer: {
    marginTop: 24,
  },
  contextInput: {
    marginBottom: 0,
  },
});

