/**
 * mock/paymentNumbers.ts — أرقام استقبال الدفع اللي بتظهر للعميل وقت
 * الشحن/الدفع. نفس شكل البيانات بالظبط اللي في admin/src/mock/
 * paymentNumbers.ts — المفروض الاتنين يبقوا نفس المحتوى دايمًا (الأدمن
 * بيتحكم فيها من صفحة "أرقام الدفع")، لحد ما يتوصّل باك إند حقيقي
 * يوحّدهم أوتوماتيك. فاضية عن قصد لحد ما يتضاف أرقام حقيقية فعلاً.
 */
export type PaymentMethodKind = 'vodafone_cash' | 'orange_cash' | 'etisalat_cash' | 'instapay' | 'bank_transfer';

export type PaymentNumber = {
  id: string;
  method: PaymentMethodKind;
  label: string;
  holderName: string;
  number: string;
  active: boolean;
};

export const METHOD_LABEL: Record<PaymentMethodKind, string> = {
  vodafone_cash: 'فودافون كاش',
  orange_cash: 'أورنج كاش',
  etisalat_cash: 'اتصالات كاش',
  instapay: 'إنستاباي',
  bank_transfer: 'تحويل بنكي',
};

export const paymentNumbers: PaymentNumber[] = [];

export function getActivePaymentNumbers() {
  return paymentNumbers.filter((p) => p.active);
}

export default paymentNumbers;
