/**
 * services/callService.ts — Phase 2B Slice 4: الطبقة الوحيدة اللي بتنادي
 * souq_masr.api.v1.calls الحقيقي. بيتابع حالة/توقيت المكالمة الحقيقيين
 * فعليًا (Ringing→Active→Ended/Declined/Missed/Cancelled، مدة محسوبة
 * سيرفر-side) — **مفيش صوت حقيقي متصل هنا** (مفيش WebRTC/مزوّد RTC
 * لسه، القرار موثّق في MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B
 * Slice 4 section "VoIP Audio Architecture"). الملف ده بيغطّي الإشارة/
 * الحالة/السجل بس، الجزء الحقيقي الوحيد اللي **مش** موجود هو الصوت نفسه.
 *
 * getCall/getActiveCallForConversation لازم يتنادوا بـPOST مش GET —
 * الاتنين ممكن يعدّلوا حالة مكالمة Ringing قديمة لـMissed
 * (calls.py's _resolve_stale_ringing)، وFrappe مبيعملش commit تلقائي
 * لتعديلات حصلت جوه معالج GET (لقيّة حقيقية اتصلحت وقت اختبار الـslice
 * دي حي — نفس السبب موثّق في lib/apiClient.ts's frappePost بالظبط،
 * مش استخدام عشوائي لـPOST هنا).
 */
import { frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.calls';

export type CallStatus = 'Ringing' | 'Active' | 'Ended' | 'Declined' | 'Missed' | 'Cancelled' | 'Failed';

export type RealCall = {
  id: string;
  conversationId: string;
  caller: string;
  callee: string;
  listingId: string | null;
  callType: 'voice';
  status: CallStatus;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
};

type RawCall = {
  id: string;
  conversation_id: string;
  caller: string;
  callee: string;
  listing_id: string | null;
  call_type: 'voice';
  status: CallStatus;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration: number | null;
};

function adapt(raw: RawCall): RealCall {
  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    caller: raw.caller,
    callee: raw.callee,
    listingId: raw.listing_id,
    callType: raw.call_type,
    status: raw.status,
    startedAt: raw.started_at,
    answeredAt: raw.answered_at,
    endedAt: raw.ended_at,
    durationSeconds: raw.duration,
  };
}

export async function startCall(conversationId: string): Promise<ApiResult<RealCall>> {
  const r = await frappePost<RawCall>(`${NS}.start_call`, { conversation_id: conversationId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function acceptCall(callId: string): Promise<ApiResult<RealCall>> {
  const r = await frappePost<RawCall>(`${NS}.accept_call`, { call_id: callId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function declineCall(callId: string): Promise<ApiResult<RealCall>> {
  const r = await frappePost<RawCall>(`${NS}.decline_call`, { call_id: callId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function endCall(callId: string): Promise<ApiResult<RealCall>> {
  const r = await frappePost<RawCall>(`${NS}.end_call`, { call_id: callId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getCall(callId: string): Promise<ApiResult<RealCall>> {
  const r = await frappePost<RawCall>(`${NS}.get_call`, { call_id: callId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adapt(r.data) };
}

export async function getActiveCallForConversation(conversationId: string): Promise<ApiResult<RealCall | null>> {
  const r = await frappePost<{ call: RawCall | null }>(`${NS}.get_active_call_for_conversation`, { conversation_id: conversationId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.call ? adapt(r.data.call) : null };
}
