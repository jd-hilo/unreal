import { useState, useEffect, useRef } from 'react';

/**
 * Hook that creates a text scramble/hacker decoder animation effect
 * Characters will cycle through random values before settling on the final text
 */
export function useTextScramble(finalText: string, duration: number = 1000) {
  const [displayText, setDisplayText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!finalText) {
      setDisplayText('');
      return;
    }

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const textLength = finalText.length;
    startTimeRef.current = Date.now();
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calculate how many characters should be "revealed"
      const revealedCount = Math.floor(progress * textLength);
      
      let result = '';
      for (let i = 0; i < textLength; i++) {
        if (i < revealedCount) {
          // This character is revealed
          result += finalText[i];
        } else {
          // This character is still scrambling
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      
      setDisplayText(result);
      
      // Stop when animation is complete
      if (progress >= 1) {
        setDisplayText(finalText);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 50); // Update every 50ms for smooth animation
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [finalText, duration]);

  return displayText;
}

