/**
 * mock/messages.ts — سجل المحادثات. مفيش محادثات وهمية؛ كل محادثة بتتولّد
 * فعليًا لما مستخدم يبدأ شات مع بائع من صفحة تفاصيل إعلان
 * (store/useAppStore → startChatForListing) — نفس المصدر اللي هيتوصّل
 * لباك إند شات حقيقي بعدين.
 */
export type ChatBubble = {
  id: string;
  from: 'me' | 'them';
  text: string;
  time: string;
  read?: boolean; // للعلامتين الزرقاوين
  /** 'system' = رسالة مولّدة من التطبيق نفسه (زي "تم تسجيل الإعلان كمباع...")
   * — لازم تتعرض بشكل مختلف بصريًا عن رسائل مستخدم حقيقية (مش من طرف
   * "me" ولا "them" فعليًا)، شوف طلب Sold Confirmation Flow §7. `from`
   * بيفضل 'me' كقيمة تقنية بس مش بتتستخدم في العرض لما kind === 'system'. */
  kind?: 'system';
  /** صورة مرفقة حقيقية (URI من معرض الجهاز) — لو موجودة، الفقاعة بتعرض
   * الصورة بدل/زيادة عن النص. */
  imageUri?: string;
};

export type Conversation = {
  id: string;
  sellerId: string;
  lastMessage: string;
  lastMessageFromMe?: boolean;
  lastMessageRead?: boolean;
  time: string;
  unread: number;
  listingId: string;
  bubbles: ChatBubble[];
};

export const conversations: Conversation[] = [];

export function getConversation(id: string) {
  return conversations.find((c) => c.id === id);
}

export default conversations;
