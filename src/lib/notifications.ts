// Daily reminder as a local notification: works offline, no server needed.
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

const MESSAGES = [
  'Pak Kur\'an sot? Synimi yt të pret.',
  'Zemrat qetësohen me përmendjen e Allahut. Hap Imanin për pak minuta.',
  'Mos e ndërprit serinë. Disa ajete mjaftojnë.',
  'Një ajet sot është më mirë se asnjë.',
];

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function enableReminder(hour: number, minute: number): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Përkujtime ditore',
      importance: AndroidImportance.DEFAULT,
    });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Iman', body: MESSAGES[new Date().getDate() % MESSAGES.length] },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' },
  });
  return true;
}

export async function disableReminder() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
