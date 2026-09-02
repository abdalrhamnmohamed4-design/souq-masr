/**
 * lib/callUiState.ts — Phase 2B Slice 4B, القسم 3 من الطلب: تسع حالات
 * واضحة (idle/outgoing_call/incoming_call/connecting/connected/ended/
 * rejected/missed/failed) محسوبة من مصدرين حقيقيين مدموجين، مش من حالة
 * محلية مُخترعة:
 *
 * 1. حالة المكالمة على الباك إند (`Souq Masr Call.status` — Ringing/
 *    Active/Ended/Declined/Missed/Cancelled/Failed، حقيقية، مأخوذة من
 *    services/callService.ts's getCall)
 * 2. حالة اتصال LiveKit الفعلية (`ConnectionState` من livekit-client —
 *    Disconnected/Connecting/Connected/Reconnecting/SignalReconnecting)
 *
 * الشاشة (app/call/[id].tsx) لما الباك إند يقول "Ringing" وأنا اللي بديت
 * المكالمة → outgoing_call (لسه مفيش اتصال RTC خالص، بننتظر الطرف التاني
 * يقبل الأول). لما الباك إند يقول "Active" → دلوقتي بس بنجيب RTC token
 * ونحاول الاتصال؛ "connecting" لحد ما LiveKit يقول Connected فعليًا،
 * وساعتها بس "connected" — الواجهة **ميقولش "متصل" إلا لو الاتصال
 * الحقيقي نجح فعلًا**، مش لمجرد إن الباك إند حالته Active (القسم 12 من
 * الطلب: "The UI must never show 'connected' unless the RTC connection
 * actually succeeded").
 *
 * "incoming_call" بتتحسب هنا بردو لكن بتتعرض فعليًا في
 * app/chat/[id].tsx's IncomingCallBanner (مش في شاشة المكالمة نفسها —
 * المستخدم بيوصل لشاشة المكالمة بعد ما يكون قرر يقبل بالفعل، مش قبلها).
 */
import type { CallStatus } from '@/services/callService';

export type CallUiState =
  | 'idle'
  | 'outgoing_call'
  | 'incoming_call'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'rejected'
  | 'missed'
  | 'failed';

/** نفس قيم livekit-client's ConnectionState (بنعرّفها هنا كنص عشان
 * الملف ده يفضل خالي من أي import لـLiveKit — منطق حساب حالة بحت). */
export type RtcConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'signalReconnecting';

export function computeCallUiState(params: {
  backendStatus: CallStatus | null;
  isCaller: boolean;
  rtcAttempted: boolean;
  rtcState: RtcConnectionState;
  rtcFailed: boolean;
}): CallUiState {
  const { backendStatus, isCaller, rtcAttempted, rtcState, rtcFailed } = params;

  if (!backendStatus) return 'idle';
  if (backendStatus === 'Ended' || backendStatus === 'Cancelled') return 'ended';
  if (backendStatus === 'Declined') return 'rejected';
  if (backendStatus === 'Missed') return 'missed';
  if (backendStatus === 'Failed') return 'failed';
  if (backendStatus === 'Ringing') return isCaller ? 'outgoing_call' : 'incoming_call';

  // Active على الباك إند — الحالة الحقيقية دلوقتي بتبقى تبع RTC بس.
  if (rtcFailed) return 'failed';
  if (!rtcAttempted) return 'connecting';
  if (rtcState === 'connected') return 'connected';
  return 'connecting';
}
