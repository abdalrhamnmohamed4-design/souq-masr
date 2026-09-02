/**
 * services/paymentService.ts — Payments vertical: souq_masr.api.v1.payments.
 * مفيش بوابة دفع حقيقية (Paymob/Stripe/إلخ) — ده باك إند حقيقي لنموذج
 * التحويل اليدوي + مراجعة الأدمن اللي المنتج مصمّم عليه أصلًا (شوف
 * payments.py's module docstring). شحن الرصيد بيبدأ Pending، مش بيتأكد
 * إلا لما أدمن حقيقي يوافق — مفيش "نجاح دفع" وهمي هنا خالص. التحويل بين
 * المستخدمين (transfer_balance) لوحده حقيقي وفوري لأنه مش بيدخل فلوس
 * جديدة للنظام.
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.payments';

export type PaymentMethodKind = 'vodafone_cash' | 'orange_cash' | 'etisalat_cash' | 'instapay' | 'bank_transfer';
export type PaymentRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type RealPaymentNumber = {
  id: string;
  method: PaymentMethodKind;
  label: string;
  holderName: string;
  number: string;
};

export type RealPaymentRequest = {
  id: string;
  amount: number;
  method: PaymentMethodKind | null;
  paymentNumber: string | null;
  referenceNote: string;
  status: PaymentRequestStatus;
  adminNote: string;
  createdAt: string;
  processedAt: string | null;
};

function adaptRequest(raw: any): RealPaymentRequest {
  return {
    id: raw.id, amount: raw.amount, method: raw.method, paymentNumber: raw.payment_number,
    referenceNote: raw.reference_note, status: raw.status, adminNote: raw.admin_note,
    createdAt: raw.created_at, processedAt: raw.processed_at,
  };
}

export async function getActivePaymentNumbers(): Promise<ApiResult<{ items: RealPaymentNumber[] }>> {
  const r = await frappeGet<{ items: any[] }>(`${NS}.get_active_payment_numbers`);
  if (r.status !== 'success') return r;
  return {
    status: 'success',
    data: { items: r.data.items.map((raw) => ({ id: raw.id, method: raw.method, label: raw.label, holderName: raw.holder_name, number: raw.number })) },
  };
}

export async function getMyWallet(): Promise<ApiResult<{ balance: number }>> {
  return frappeGet(`${NS}.get_my_wallet`);
}

export async function createTopupRequest(amount: number, method?: PaymentMethodKind, paymentNumberId?: string, referenceNote?: string): Promise<ApiResult<RealPaymentRequest>> {
  const r = await frappePost<any>(`${NS}.create_topup_request`, { amount, method, payment_number: paymentNumberId, reference_note: referenceNote });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptRequest(r.data) };
}

export async function getMyPaymentRequests(page = 1, limit = 20): Promise<ApiResult<{ items: RealPaymentRequest[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.get_my_payment_requests`, { page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptRequest), total: r.data.total } };
}

export async function transferBalance(toPhone: string, amount: number): Promise<ApiResult<{ balance: number }>> {
  return frappePost(`${NS}.transfer_balance`, { to_phone: toPhone, amount });
}
