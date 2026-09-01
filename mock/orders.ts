/**
 * mock/orders.ts — Order، جاهز كبنية بيانات بس مش متوصّل بأي واجهة لسه.
 *
 * التطبيق دلوقتي "تواصل واتفاوض" (شات + مكالمة) لكل الإعلانات، مش عربة
 * شراء حقيقية — ده قرار متعمّد عشان يفضل زي OLX/OpenSooq في المرحلة دي
 * (PART "استراتيجية الإطلاق": ماركت بليس عام الأول، البراندات المحلية
 * بعدين لما يبقى فيه traffic). الـ type ده معمول دلوقتي بس عشان لما
 * حساب تجاري يحتاج "اطلب دلوقتي" حقيقي (مقاس/لون محدد + كمية + عنوان
 * شحن) — النموذج يبقى جاهز من غير ما نعيد بناء أي حاجة تانية.
 */
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  listingId: string;
  variantId?: string; // لو المنتج بيبيع variants (مقاس/لون)
  quantity: number;
  buyerName: string;
  buyerPhone: string;
  shippingAddress?: string;
  status: OrderStatus;
  createdAt: string; // ISO
};
