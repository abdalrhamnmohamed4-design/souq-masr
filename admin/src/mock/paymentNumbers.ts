/**
 * src/mock/paymentNumbers.ts — أرقام استقبال الدفع (فودافون كاش/إنستاباي/
 * تحويل بنكي...) اللي بتظهر للعميل وقت الدفع. فاضية عن قصد — دي بيانات
 * تشغيلية حقيقية لازم صاحب المنصة يدخلها بنفسه من صفحة "أرقام الدفع"،
 * مش أرقام وهمية بنخترعها.
 */
import type { PaymentNumber } from '@/types';

export const paymentNumbers: PaymentNumber[] = [];

export default paymentNumbers;
