import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#25729f',
    });
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

  if (!projectId) {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // profiles PK is user_id (not id)
  await supabase
    .from('profiles')
    .update({ push_token: token, push_token_tz: timezone })
    .eq('user_id', userId);

  return token;
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
