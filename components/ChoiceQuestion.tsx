import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Input } from './Input';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

interface ChoiceQuestionProps {
  question: string;
  options: string[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  otherValue?: string;
  onOtherChange?: (value: string) => void;
  placeholder?: string;
}

export function ChoiceQuestion({
  question,
  options,
  selectedValue,
  onSelect,
  otherValue = '',
  onOtherChange,
  placeholder = 'Please specify...',
}: ChoiceQuestionProps) {
  const [showOtherInput, setShowOtherInput] = useState(false);

  function handleOptionPress(option: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (option === 'Other') {
      setShowOtherInput(true);
      onSelect('Other');
    } else {
      setShowOtherInput(false);
      onSelect(option);
      if (onOtherChange) {
        onOtherChange('');
      }
    }
  }

  function handleOtherInputChange(text: string) {
    if (onOtherChange) {
      onOtherChange(text);
      if (text.trim()) {
        onSelect('Other');
      }
    }
  }

  return (
    <View style={styles.container}>
      {question ? <Text style={styles.question}>{question}</Text> : null}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = selectedValue === option || (option === 'Other' && selectedValue === 'Other');
          return (
            <TouchableOpacity
              key={index}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handleOptionPress(option)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {showOtherInput && (
        <View style={styles.otherInputContainer}>
          <Input
            placeholder={placeholder}
            value={otherValue}
            onChangeText={handleOtherInputChange}
            autoFocus
            containerStyle={styles.otherInput}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: Fonts.secondary.bold,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    padding: 16,
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  optionSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.gradients.turquoise[1],
    borderWidth: 2,
    shadowColor: Colors.gradients.turquoise[1],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.gradients.turquoise[1],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gradients.turquoise[1],
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
    fontFamily: Fonts.secondary.bold,
  },
  optionTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  otherInputContainer: {
    marginTop: 12,
    paddingLeft: 32,
  },
  otherInput: {
    marginBottom: 0,
  },
});

