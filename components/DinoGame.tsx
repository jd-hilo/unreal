import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, Easing } from 'react-native';
import { Colors, Fonts } from '@/constants/Theme';
import { RefreshCw, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const GAME_WIDTH = width - 48; // Padding
const GAME_HEIGHT = 200;
const DINO_SIZE = 40;
const OBSTACLE_SIZE = 30;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const INITIAL_SPEED = 6;
const MAX_SPEED = 18;
const SPEED_INCREMENT = 0.2;

export interface DinoGameRef {
  jump: () => void;
}

export const DinoGame = forwardRef<DinoGameRef>((props, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  // Game loop ref
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  
  // Game state refs (for performance)
  const dinoY = useRef(0);
  const dinoVelocity = useRef(0);
  const obstacleX = useRef(GAME_WIDTH);
  const scoreRef = useRef(0);
  const gameSpeed = useRef(INITIAL_SPEED);
  
  // Animated values for rendering
  const dinoYAnim = useRef(new Animated.Value(0)).current;
  const obstacleXAnim = useRef(new Animated.Value(GAME_WIDTH)).current;

  const startGame = useCallback(() => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    scoreRef.current = 0;
    
    dinoY.current = 0;
    dinoVelocity.current = 0;
    obstacleX.current = GAME_WIDTH;
    gameSpeed.current = INITIAL_SPEED;
    
    dinoYAnim.setValue(0);
    obstacleXAnim.setValue(GAME_WIDTH);
    
    lastTimeRef.current = Date.now();
    requestRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const jump = useCallback(() => {
    if (!isPlaying) {
      startGame();
      return;
    }
    
    // Only jump if on ground (or close to it)
    if (dinoY.current >= 0) {
      dinoVelocity.current = JUMP_FORCE;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isPlaying, startGame]);

  const gameLoop = useCallback(() => {
    if (!lastTimeRef.current) lastTimeRef.current = Date.now();
    
    // Update physics
    dinoVelocity.current += GRAVITY;
    dinoY.current += dinoVelocity.current;
    
    // Ground collision
    if (dinoY.current > 0) {
      dinoY.current = 0;
      dinoVelocity.current = 0;
    }
    
    // Move obstacle
    obstacleX.current -= gameSpeed.current;
    
    // Reset obstacle
    if (obstacleX.current < -OBSTACLE_SIZE) {
      // Add random gap between obstacles (0 to 300px)
      const randomGap = Math.random() * 300;
      obstacleX.current = GAME_WIDTH + randomGap;
      
      scoreRef.current += 1;
      setScore(scoreRef.current);
      
      // Increase speed
      if (gameSpeed.current < MAX_SPEED) {
        gameSpeed.current += SPEED_INCREMENT;
      }
    }
    
    // Collision detection
    // Simple AABB collision
    // Dino box: x: 20, y: GAME_HEIGHT - 40 - dinoY, w: 40, h: 40
    // Obstacle box: x: obstacleX, y: GAME_HEIGHT - 30, w: 30, h: 30
    
    const dinoLeft = 20; // Fixed X position
    const dinoRight = 20 + DINO_SIZE - 10; // -10 for forgiveness
    const dinoTop = GAME_HEIGHT - DINO_SIZE - dinoY.current + 10; // +10 for forgiveness
    const dinoBottom = GAME_HEIGHT - dinoY.current;
    
    const obsLeft = obstacleX.current + 5; // +5 for forgiveness
    const obsRight = obstacleX.current + OBSTACLE_SIZE - 5;
    const obsTop = GAME_HEIGHT - OBSTACLE_SIZE + 5;
    const obsBottom = GAME_HEIGHT;
    
    if (
      dinoRight > obsLeft &&
      dinoLeft < obsRight &&
      dinoBottom > obsTop &&
      dinoTop < obsBottom
    ) {
      // Collision!
      setGameOver(true);
      setIsPlaying(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
      }
      return; // Stop loop
    }
    
    // Update animations directly
    dinoYAnim.setValue(dinoY.current);
    obstacleXAnim.setValue(obstacleX.current);
    
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [highScore]);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    jump,
  }));

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={jump} 
        style={styles.gameArea}
      >
        {/* Sky/Background */}
        <View style={styles.sky}>
          <Text style={styles.scoreText}>{isPlaying ? score : `High Score: ${highScore}`}</Text>
          {!isPlaying && !gameOver && (
            <View style={styles.startMessage}>
              <Play size={32} color={Colors.textSecondary} />
              <Text style={styles.startText}>Tap to Play</Text>
            </View>
          )}
          {gameOver && (
            <View style={styles.gameOverMessage}>
              <Text style={styles.gameOverText}>Game Over</Text>
              <View style={styles.restartButton}>
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.restartText}>Tap to Restart</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Ground */}
        <View style={styles.ground} />
        
        {/* Dino Character */}
        <Animated.View 
          style={[
            styles.dino,
            {
              transform: [
                { translateY: dinoYAnim.interpolate({
                    inputRange: [-200, 0],
                    outputRange: [-200, 0]
                  }) 
                }
              ]
            }
          ]}
        >
          <Image 
            source={require('@/assets/images/manwhite.png')} 
            style={styles.dinoImage} 
            resizeMode="contain" 
          />
        </Animated.View>
        
        {/* Obstacle */}
        <Animated.View 
          style={[
            styles.obstacle,
            {
              transform: [{ translateX: obstacleXAnim }]
            }
          ]}
        >
          <View style={styles.obstacleShape} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: GAME_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 24,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  sky: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ground: {
    height: 2,
    backgroundColor: '#E5E5E5',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  dino: {
    position: 'absolute',
    left: 20,
    bottom: 0,
    width: DINO_SIZE,
    height: DINO_SIZE,
    zIndex: 10,
  },
  dinoImage: {
    width: '100%',
    height: '100%',
  },
  obstacle: {
    position: 'absolute',
    left: 0, // Controlled by translateX
    bottom: 0,
    width: OBSTACLE_SIZE,
    height: OBSTACLE_SIZE,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  obstacleShape: {
    width: 20,
    height: 30,
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  scoreText: {
    position: 'absolute',
    top: 16,
    right: 20,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  startMessage: {
    alignItems: 'center',
    gap: 8,
  },
  startText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  gameOverMessage: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 16,
  },
  gameOverText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gradients.purple[1],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  restartText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: Fonts.secondary.bold,
  },
});
