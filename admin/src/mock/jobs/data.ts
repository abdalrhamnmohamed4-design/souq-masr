/**
 * src/mock/jobs/data.ts — سجلات الإدارة (وظائف/شركات/محترفين/خدمات/
 * تقديمات/بلاغات) فاضية عن قصد. من غير باك إند مشترك، الأدمن مش شايف
 * بيانات المستخدمين الحقيقية اللي بتتنشر من تطبيق الموبايل (كل تطبيق
 * عنده نسخته المحلية) — هيتوحّدوا تلقائيًا لما الـERP يوصل.
 */
import type { CandidateSummary, Company, Job, JobApplicationSummary, JobsReport, ProfessionalProfileSummary, Service } from './types';

export const companies: Company[] = [];
export const jobs: Job[] = [];
export const candidates: CandidateSummary[] = [];
export const professionals: ProfessionalProfileSummary[] = [];
export const services: Service[] = [];
export const applications: JobApplicationSummary[] = [];
export const jobsReports: JobsReport[] = [];
