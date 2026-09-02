/**
 * services/rtcService.ts — Phase 2B Slice 4B: الطبقة الوحيدة اللي بتجيب
 * LiveKit access token حقيقي من الباك إند (souq_masr.api.v1.calls.
 * get_rtc_token). الـtoken قصير العمر (600 ثانية، calls.py's
 * LIVEKIT_TOKEN_TTL_SECONDS) ومقصور على غرفة/هوية المستخدم الحالي بس —
 * مفيش سر LiveKit (API secret) هنا خالص ولا في أي كود موبايل تاني، الـ
 * secret فضل سيرفر-side بالكامل (site_config.json على الـVPS).
 */
import { frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.calls';

export type RtcToken = {
  token: string;
  wsUrl: string;
  room: string;
  identity: string;
};

type RawRtcToken = {
  token: string;
  ws_url: string;
  room: string;
  identity: string;
};

export async function getRtcToken(callId: string): Promise<ApiResult<RtcToken>> {
  const r = await frappePost<RawRtcToken>(`${NS}.get_rtc_token`, { call_id: callId });
  if (r.status !== 'success') return r;
  return {
    status: 'success',
    data: { token: r.data.token, wsUrl: r.data.ws_url, room: r.data.room, identity: r.data.identity },
  };
}
