/**
 * lib/notifications.ts — إشعارات محلية حقيقية (OS notification center)،
 * مش push حقيقي: من غير باك إند مفيش سيرفر يبعت push، وExpo Go بقى مش
 * بيدعم remote push من الأساس بداية من SDK 53 (بيشتغل بس في dev build
 * حقيقي متوصّل بسيرفر). اللي بيحصل هنا: التطبيق نفسه بيجدول إشعار محلي
 * لحظي كل ما حدث حقيقي يحصل جوّاه (نشر إعلان، تمييزه...)، فبيظهر في
 * مركز إشعارات الجهاز حتى لو التطبيق في الخلفية — ده أقصى حاجة حقيقية
 * ممكنة قبل ما يتوصّل باك إند بيرسل push فعلي من سيرفر.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;

async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionAsked) return false; // متسألش تاني في نفس الجلسة لو المستخدم رفض
    permissionAsked = true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false; // بيئات مش بتدعم إشعارات (زي المتصفح) — تجاهل بهدوء
  }
}

/** يجدول إشعار محلي يظهر فورًا في مركز إشعارات الجهاز. */
export async function fireLocalNotification(title: string, body: string) {
  const granted = await ensurePermission();
  if (!granted) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'إشعارات سوق مصر',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // فوري
    });
  } catch {
    // تجاهل — إشعار الـin-app جوه التطبيق (notifications.tsx) فضل شغال بغض النظر
  }
}
