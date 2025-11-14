import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
  speed?: number; // ms per character
  pauseBetweenLines?: number; // ms pause after each line completes
  onLineStart?: (lineIndex: number) => void; // Callback when a line starts typing
  onLineComplete?: (lineIndex: number) => void; // Callback when a line completes
  onAllComplete?: () => void; // Callback when all lines are complete
  onCharTyped?: (lineIndex: number, charIndex: number) => void; // Callback when a character is typed
}

/**
 * Hook for typewriter animation effect
 * Types out multiple lines of text character by character
 */
export function useTypewriter(
  lines: string[],
  options: UseTypewriterOptions = {}
) {
  const {
    speed = 40,
    pauseBetweenLines = 500,
    onLineStart,
    onLineComplete,
    onAllComplete,
    onCharTyped,
  } = options;

  const [displayedLines, setDisplayedLines] = useState<string[]>(
    lines.map(() => '')
  );
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    // Reset when lines change
    setDisplayedLines(lines.map(() => ''));
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);
    setIsComplete(false);
    isPausedRef.current = false;

    // Start typing first line after a brief delay
    const startDelay = setTimeout(() => {
      if (lines.length > 0 && onLineStart) {
        onLineStart(0);
      }
    }, 250); // Fade-in delay

    return () => {
      clearTimeout(startDelay);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [lines.join('')]);

  useEffect(() => {
    if (isComplete || isPausedRef.current || lines.length === 0) {
      return;
    }

    const currentLine = lines[currentLineIndex];
    if (!currentLine) {
      return;
    }

    // If we've completed all characters in current line
    if (currentCharIndex >= currentLine.length) {
      // Mark line as complete
      if (onLineComplete) {
        onLineComplete(currentLineIndex);
      }

      // Check if this was the last line
      if (currentLineIndex >= lines.length - 1) {
        setIsComplete(true);
        if (onAllComplete) {
          onAllComplete();
        }
        return;
      }

      // Pause before starting next line
      isPausedRef.current = true;
      timeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
        setCurrentLineIndex((prev) => {
          const nextIndex = prev + 1;
          if (onLineStart && nextIndex < lines.length) {
            onLineStart(nextIndex);
          }
          return nextIndex;
        });
        setCurrentCharIndex(0);
      }, pauseBetweenLines);

      return;
    }

    // Type next character
    timeoutRef.current = setTimeout(() => {
      setDisplayedLines((prev) => {
        const updated = [...prev];
        updated[currentLineIndex] = currentLine.substring(0, currentCharIndex + 1);
        return updated;
      });
      
      // Trigger haptic for each character typed
      if (onCharTyped) {
        onCharTyped(currentLineIndex, currentCharIndex);
      }
      
      setCurrentCharIndex((prev) => prev + 1);
    }, speed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentLineIndex, currentCharIndex, lines, speed, pauseBetweenLines, isComplete, onLineComplete, onLineStart, onAllComplete, onCharTyped]);

  return {
    displayedLines,
    currentLineIndex,
    isComplete,
  };
}

