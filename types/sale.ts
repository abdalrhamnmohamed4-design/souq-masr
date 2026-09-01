/**
 * types/sale.ts — بنية بيانات "تأكيد البيع من الشات" (طلب Sold
 * Confirmation Flow §3/§10). مصمّمة عشان تتحوّل مباشرة لـFrappe DocType
 * لاحقًا (كل حقل هنا = حقل DocType مرشّح، من غير ترجمة/إعادة تسمية):
 * "Souq Masr Listing Sale" — listing (Link → Souq Masr Listing لما توجد)،
 * seller/buyer (Link → User)، sale_status، sold_at (Datetime)،
 * sale_method (Select)، custom_sale_method (Data)، conversation (Link)،
 * confirmation_source (Select)، creation (Frappe's own timestamp).
 */

export type SaleMethod =
  | 'whatsapp'
  | 'phone_call'
  | 'personal_visit'
  | 'in_app_chat'
  | 'broker'
  | 'other';

export const SALE_METHOD_LABELS: Record<SaleMethod, string> = {
  whatsapp: 'عن طريق واتساب',
  phone_call: 'عن طريق اتصال هاتفي',
  personal_visit: 'عن طريق زيارة شخصية',
  in_app_chat: 'عن طريق الشات داخل سوق مصر',
  broker: 'عن طريق وسيط',
  other: 'أخرى',
};

export const SALE_METHOD_ORDER: SaleMethod[] = [
  'whatsapp',
  'phone_call',
  'personal_visit',
  'in_app_chat',
  'broker',
  'other',
];

export type SaleRecord = {
  id: string;
  listingId: string;
  sellerId: string;
  buyerId?: string;
  saleStatus: 'sold';
  soldAt: string; // ISO
  saleMethod: SaleMethod;
  customSaleMethod?: string; // بس لو saleMethod === 'other'
  conversationId: string;
  confirmationSource: 'chat';
  timestamp: string; // ISO — وقت تسجيل السجل نفسه (Frappe's creation مستقبلًا)
};

/** حالة تدفق التأكيد الحيّة (شوف lib/soldIntent.ts للـtrigger، و
 * useAppStore's startSaleConfirmation/confirmListingSold/cancelSoldConfirmation). */
export type PendingSaleConfirmation = {
  conversationId: string;
  listingId: string;
  stage: 'ask_sold' | 'ask_method' | 'ask_custom_method';
};
