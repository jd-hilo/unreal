import { View, StyleSheet, Platform } from 'react-native';
import { useState } from 'react';
import { Audio } from 'expo-av';
import { Button } from './Button';
import { Mic, Square, Play } from 'lucide-react-native';

interface AudioRecorderProps {
  onRecordingComplete: (uri: string) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  async function startRecording() {
    try {
      if (Platform.OS !== 'web') {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (uri) {
        setRecordedUri(uri);
        onRecordingComplete(uri);
      }

      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  }

  async function playSound() {
    if (!recordedUri) return;

    try {
      const { sound } = await Audio.Sound.createAsync({ uri: recordedUri });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play sound', error);
    }
  }

  return (
    <View style={styles.container}>
      {!isRecording && !recordedUri && (
        <Button
          title="Start Recording"
          onPress={startRecording}
          variant="primary"
          size="large"
        />
      )}

      {isRecording && (
        <Button
          title="Stop Recording"
          onPress={stopRecording}
          variant="secondary"
          size="large"
        />
      )}

      {recordedUri && !isRecording && (
        <View style={styles.actions}>
          <Button
            title="Play"
            onPress={playSound}
            variant="outline"
            size="medium"
          />
          <Button
            title="Record Again"
            onPress={() => {
              setRecordedUri(null);
              startRecording();
            }}
            variant="secondary"
            size="medium"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
});
