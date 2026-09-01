/**
 * src/mock/jobs/types.ts — نسخة الأدمن من نماذج "الوظائف والمهن
 * والخدمات" — نفس بنية الموبايل بالظبط (mock/jobs/types.ts)، الفرق
 * الوحيد إن icon هنا اسم أيقونة Lucide (نص) بدل IconName. من غير باك
 * إند، أي وظيفة/خدمة/محترف اتنشر من تطبيق الموبايل مش هيظهر هنا —
 * الأدمن شايف بس اللي هيتنشر فعليًا من نفس مصدر بيانات مشترك بعد
 * الـERP. جداول الإدارة (Jobs/Companies/Professionals/Services/
 * Applications) فاضية عن قصد؛ جداول المرجع (JobCategory/Profession/
 * ServiceCategory/Trade/Skill) حقيقية وقابلة للإدارة فعليًا.
 */

export type CareerLevel = 'intern' | 'entry' | 'junior' | 'mid' | 'senior' | 'manager' | 'director' | 'executive';
export type WorkType = 'full_time' | 'part_time' | 'remote' | 'hybrid' | 'freelance' | 'contract' | 'temporary' | 'internship';
export type JobStatus = 'draft' | 'pending' | 'published' | 'paused' | 'closed' | 'expired' | 'rejected';
export type ApplicationStatus = 'applied' | 'viewed' | 'shortlisted' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'withdrawn';
export type JobsVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';
export type PriceType = 'fixed' | 'starting_from' | 'hourly' | 'negotiable';
export type ServiceStatus = 'active' | 'paused' | 'deleted';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export const CAREER_LEVEL_LABELS: Record<CareerLevel, string> = {
  intern: 'متدرّب', entry: 'حديث التخرج', junior: 'مبتدئ', mid: 'متوسط الخبرة',
  senior: 'خبير', manager: 'مدير', director: 'مدير عام', executive: 'تنفيذي',
};
export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  full_time: 'دوام كامل', part_time: 'دوام جزئي', remote: 'عن بُعد', hybrid: 'هجين',
  freelance: 'فريلانس', contract: 'عقد مؤقت', temporary: 'مؤقت', internship: 'تدريب',
};
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'مسودة', pending: 'قيد المراجعة', published: 'منشورة', paused: 'موقوفة مؤقتًا',
  closed: 'مقفولة', expired: 'منتهية', rejected: 'مرفوضة',
};
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'اتقدّم', viewed: 'اتشاف', shortlisted: 'قايمة مختصرة', interview: 'مقابلة',
  offer: 'عرض عمل', accepted: 'اتقبل', rejected: 'اترفض', withdrawn: 'اتسحب',
};

export type JobCategory = { id: string; parentId: null; name: string; nameEn: string; icon: string; order: number };
export type Profession = { id: string; categoryId: string; name: string; nameEn: string };
export type ServiceCategory = { id: string; parentId: null; name: string; nameEn: string; icon: string; order: number };
export type Trade = { id: string; categoryId: string; name: string; nameEn: string };
export type SkillCategory = 'technical' | 'soft';
export type Skill = { id: string; name: string; category: SkillCategory };

export type Company = {
  id: string; ownerName: string; name: string; logoUri?: string; description: string;
  industry: string; size: CompanySize; city: string; website?: string; phone?: string;
  verification: JobsVerificationStatus; activeJobsCount: number; createdAt: string;
};

export type Job = {
  id: string; title: string; companyId: string; companyName: string; categoryId: string; professionId?: string;
  workType: WorkType; careerLevel?: CareerLevel; city: string; remote: boolean;
  salaryMin?: number; salaryMax?: number; postedAt: string; deadline?: string;
  status: JobStatus; isFeatured: boolean; isUrgent: boolean; views: number; applicationsCount: number; reportsCount: number;
};

export type JobApplicationSummary = {
  id: string; jobId: string; jobTitle: string; candidateName: string; status: ApplicationStatus; appliedAt: string;
};

/** ملخص مرشّح للعرض الإداري بس — مش الـCareerProfile الكامل (PART 39:
 * الأدمن ميوصلش لملفات الـCV الخاصة إلا حسب الصلاحيات). */
export type CandidateSummary = {
  id: string; fullName: string; profession: string; city: string; yearsExperience?: number;
  applicationsCount: number; profileVisibility: 'public' | 'employers_only' | 'private'; joinedAt: string;
};

export type ProfessionalProfileSummary = {
  id: string; name: string; tradeId?: string; city: string; yearsExperience?: number;
  verification: JobsVerificationStatus; servicesCount: number; rating?: number; createdAt: string;
};

export type Service = {
  id: string; title: string; professionalId: string; professionalName: string; categoryId: string; tradeId?: string;
  price?: number; priceType: PriceType; serviceAreas: string[]; status: ServiceStatus; postedAt: string; reportsCount: number;
};

export type JobsReportType = 'fake_job' | 'scam' | 'wrong_category' | 'duplicate' | 'prohibited' | 'spam' | 'abusive' | 'other';

export type JobsReport = {
  id: string; type: JobsReportType; targetType: 'job' | 'company' | 'professional' | 'service';
  targetId: string; targetLabel: string; reporterName: string; createdAt: string; status: ReportStatus; notes?: string;
};
