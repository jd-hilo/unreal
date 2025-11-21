import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Input } from './Input';
import * as Haptics from 'expo-haptics';

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
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 250, 0.2)',
    padding: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    borderColor: 'rgba(135, 206, 250, 0.6)',
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
    borderColor: 'rgba(135, 206, 250, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: 'rgba(135, 206, 250, 0.9)',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(135, 206, 250, 0.9)',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  otherInputContainer: {
    marginTop: 12,
    paddingLeft: 32,
  },
  otherInput: {
    marginBottom: 0,
  },
});

