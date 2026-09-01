/**
 * mock/jobs/data.ts — سجلات الوظائف/الشركات/الخدمات الحقيقية. زي
 * mock/listings.ts بالظبط: فاضية عن قصد — مفيش وظايف أو شركات أو
 * محترفين وهميين. كل حاجة هنا بتتملى فعليًا من نشاط المستخدم الحقيقي
 * (نشر وظيفة، إنشاء ملف مهني، إضافة خدمة)، جاهزة لما يتوصّل باك إند ERP
 * يغذّيها بدل المستخدم لوحده.
 */
import type { Company, Job, JobsReview, Service } from './types';

export const companies: Company[] = [];
export const jobs: Job[] = [];
export const services: Service[] = [];
export const jobsReviews: JobsReview[] = [];

export function getCompany(id: string) {
  return companies.find((c) => c.id === id);
}
export function getJob(id: string) {
  return jobs.find((j) => j.id === id);
}
export function getService(id: string) {
  return services.find((s) => s.id === id);
}
export function getReviewsFor(targetType: JobsReview['targetType'], targetId: string) {
  return jobsReviews.filter((r) => r.targetType === targetType && r.targetId === targetId);
}
