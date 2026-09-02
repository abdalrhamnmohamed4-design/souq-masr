/**
 * services/chatService.ts — Phase 2B Slice 4: الطبقة الوحيدة اللي بتنادي
 * souq_masr.api.v1.chat الحقيقي. كل توقيت راجع هنا هو created_at الحقيقي
 * من السيرفر (Frappe's `creation`، بتوقيت Africa/Cairo — System Settings،
 * شوف MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B Slice 4 section
 * لقصة اكتشاف/إصلاح إن التوقيت كان Asia/Kolkata افتراضيًا) — الموبايل
 * بيعرضه بس، مش بيولّده أبدًا.
 *
 * شكل البيانات هنا مختلف عمدًا عن mock/messages.ts's Conversation/
 * ChatBubble (القديمين، لسه موجودين لإعلانات mock بدون تغيير) — محادثة
 * حقيقية عندها بنية أغنى (buyer/seller حقيقيين، رسائل بـid وsender
 * حقيقيين، أحداث مكالمات) مش هتتقارن بشكل نضيف مع النموذج المحلي، فبدل
 * ما نلوي النوعين القديمين ليها، الشاشات (app/chat/[id].tsx،
 * app/(tabs)/messages.tsx) بتتفرّع صراحة بين المصدرين (isRealConversationId)
 * — نفس نمط detail/[id].tsx بالظبط.
 */
import { frappeGet, frappePost, frappeUploadFile, type LocalFileUpload } from '@/lib/apiClient';
import { API_BASE_URL } from '@/config/env';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.chat';

export type RealMessageKind = 'Text' | 'System' | 'CallEvent';

export type RealMessage = {
  id: string;
  conversationId: string;
  kind: RealMessageKind;
  text: string;
  image: string | null; // absolute URL جاهز للعرض
  callId: string | null;
  isRead: boolean;
  sender: string; // Frappe User id — قارنه بـuserId المخزّن (lib/authCredentials.ts) عشان تعرف "أنا" ولا "هو"
  createdAt: string; // خام من السيرفر — التاريخ/الوقت المعروض بيتحسب منه في الشاشة، مش هنا
};

export type RealConversationListingContext = {
  id: string;
  title: string;
  price: number;
  status: string;
  thumb: string | null; // absolute URL
};

export type RealConversationMeta = {
  id: string;
  otherParty: { id: string; name: string; phone: string | null };
  listing: RealConversationListingContext | null;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  isBuyer: boolean;
  unread?: number; // موجودة بس في getMyConversations
};

type RawMessage = {
  id: string;
  conversation_id: string;
  kind: RealMessageKind;
  text: string;
  image: string | null;
  call_id: string | null;
  is_read: boolean;
  sender: string;
  created_at: string;
};

type RawConversationListing = { id: string; title: string; price: number; status: string; thumb: string | null };
type RawConversationMeta = {
  id: string;
  other_party: { id: string; name: string; phone: string | null };
  listing: RawConversationListing | null;
  last_message_at: string | null;
  last_message_preview: string;
  is_buyer: boolean;
  unread?: number;
};

function absoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL ?? ''}${url}`;
}

function adaptMessage(raw: RawMessage): RealMessage {
  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    kind: raw.kind,
    text: raw.text,
    image: absoluteUrl(raw.image),
    callId: raw.call_id,
    isRead: raw.is_read,
    sender: raw.sender,
    createdAt: raw.created_at,
  };
}

function adaptConversationMeta(raw: RawConversationMeta): RealConversationMeta {
  return {
    id: raw.id,
    otherParty: raw.other_party,
    listing: raw.listing
      ? { id: raw.listing.id, title: raw.listing.title, price: raw.listing.price, status: raw.listing.status, thumb: absoluteUrl(raw.listing.thumb) }
      : null,
    lastMessageAt: raw.last_message_at,
    lastMessagePreview: raw.last_message_preview,
    isBuyer: raw.is_buyer,
    unread: raw.unread,
  };
}

/** محادثة حقيقية دايمًا CONV-##### (Souq Masr Conversation's autoname) —
 * أي id تاني (c-... القديم من mock/messages.ts) لسه محلي بالكامل. */
export function isRealConversationId(id: string | undefined | null): boolean {
  return !!id && /^CONV-\d+$/.test(id);
}

export async function startConversation(listingId: string): Promise<ApiResult<RealConversationMeta>> {
  const r = await frappePost<RawConversationMeta>(`${NS}.start_conversation`, { listing_id: listingId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptConversationMeta(r.data) };
}

export async function getMyConversations(): Promise<ApiResult<RealConversationMeta[]>> {
  const r = await frappeGet<{ items: RawConversationMeta[] }>(`${NS}.get_my_conversations`);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.items.map(adaptConversationMeta) };
}

export async function getConversation(
  conversationId: string,
  page = 1,
  limit = 50,
): Promise<ApiResult<{ conversation: RealConversationMeta; messages: RealMessage[]; total: number }>> {
  const r = await frappeGet<{ conversation: RawConversationMeta; messages: RawMessage[]; total: number }>(`${NS}.get_conversation`, {
    conversation_id: conversationId,
    page,
    limit,
  });
  if (r.status !== 'success') return r;
  return {
    status: 'success',
    data: { conversation: adaptConversationMeta(r.data.conversation), messages: r.data.messages.map(adaptMessage), total: r.data.total },
  };
}

export async function sendMessage(conversationId: string, text: string): Promise<ApiResult<RealMessage>> {
  const r = await frappePost<RawMessage>(`${NS}.send_message`, { conversation_id: conversationId, text });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptMessage(r.data) };
}

export async function uploadChatImage(file: LocalFileUpload): Promise<ApiResult<string>> {
  const r = await frappeUploadFile(file);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.fileUrl };
}

export async function sendImageMessage(conversationId: string, imageUrl: string): Promise<ApiResult<RealMessage>> {
  const r = await frappePost<RawMessage>(`${NS}.send_image_message`, { conversation_id: conversationId, image_url: imageUrl });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptMessage(r.data) };
}

export async function markRead(conversationId: string): Promise<ApiResult<{ marked: true }>> {
  return frappePost(`${NS}.mark_read`, { conversation_id: conversationId });
}
