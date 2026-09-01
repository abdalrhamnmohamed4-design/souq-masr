/**
 * mock/jobs/types.ts — نماذج بيانات نظام "الوظائف والمهن والخدمات
 * المهنية" (PART 41: مش listing عام واحد — كل كيان له شكله المستقل
 * عشان يبقى جاهز لباك إند ERP حقيقي بعدين من غير إعادة بناء).
 *
 * قسمين منفصلين تمامًا زي ما اتطلب صراحة (PART 25/28):
 * - "الوظائف" (Job/Company/Candidate...) — سوق شركات ووظائف احترافية.
 * - "المهن والخدمات" (Trade/ProfessionalProfile/Service) — حرفيين
 *   وخدمات (كهربائي، سباك...) — تجربة مختلفة تمامًا، مش نفس التصنيفات.
 */
import type { IconName } from '@/components/Icon';

// ============================================================ Enums مشتركة
export type CareerLevel = 'intern' | 'entry' | 'junior' | 'mid' | 'senior' | 'manager' | 'director' | 'executive';
export type WorkType = 'full_time' | 'part_time' | 'remote' | 'hybrid' | 'freelance' | 'contract' | 'temporary' | 'internship';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type LanguageLevel = 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';
export type JobStatus = 'draft' | 'pending' | 'published' | 'paused' | 'closed' | 'expired' | 'rejected';
export type ApplicationStatus = 'applied' | 'viewed' | 'shortlisted' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'withdrawn';
export type JobsVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ProfileVisibility = 'public' | 'employers_only' | 'private';
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export const CAREER_LEVEL_LABELS: Record<CareerLevel, string> = {
  intern: 'متدرّب', entry: 'حديث التخرج', junior: 'مبتدئ', mid: 'متوسط الخبرة',
  senior: 'خبير', manager: 'مدير', director: 'مدير عام', executive: 'تنفيذي',
};
export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  full_time: 'دوام كامل', part_time: 'دوام جزئي', remote: 'عن بُعد', hybrid: 'هجين',
  freelance: 'فريلانس', contract: 'عقد مؤقت', temporary: 'مؤقت', internship: 'تدريب',
};
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', expert: 'خبير',
};
export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  basic: 'أساسي', intermediate: 'متوسط', advanced: 'متقدم', fluent: 'طلاقة', native: 'لغة أم',
};
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'اتقدّمت', viewed: 'اتشافت', shortlisted: 'ف القايمة المختصرة', interview: 'مقابلة',
  offer: 'عرض عمل', accepted: 'اتقبلت', rejected: 'اترفضت', withdrawn: 'اتسحبت',
};
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'مسودة', pending: 'قيد المراجعة', published: 'منشورة', paused: 'موقوفة مؤقتًا',
  closed: 'مقفولة', expired: 'منتهية', rejected: 'مرفوضة',
};

// ============================================================ التصنيفات المهنية (وظائف الشركات)
export type JobCategory = { id: string; parentId: null; name: string; nameEn: string; icon: IconName; order: number };
export type Profession = { id: string; categoryId: string; name: string; nameEn: string };

// ============================================================ المهن والخدمات (حرفيين — منفصل تمامًا)
export type ServiceCategory = { id: string; parentId: null; name: string; nameEn: string; icon: IconName; order: number };
export type Trade = { id: string; categoryId: string; name: string; nameEn: string };

export type SkillCategory = 'technical' | 'soft';
export type Skill = { id: string; name: string; category: SkillCategory };

// ============================================================ الشركة/جهة التوظيف
export type Company = {
  id: string;
  ownerSellerId: string; // 'me' حاليًا — امتداد لحساب المستخدم زي الحساب التجاري بالظبط
  name: string;
  logoUri?: string;
  coverUri?: string;
  description: string;
  industry: string;
  size: CompanySize;
  city: string;
  website?: string;
  phone?: string;
  email?: string;
  workingHours?: string;
  verification: JobsVerificationStatus;
  createdAt: string;
};

// ============================================================ الملف المهني للباحث عن عمل (Candidate / Career Profile)
export type Education = {
  id: string;
  degree: string;
  fieldOfStudy: string;
  institution: string;
  country: string;
  city: string;
  startDate: string; // ISO
  graduationDate?: string; // ISO — فاضي لو لسه بيدرس
  grade?: string;
  description?: string;
};

export type Experience = {
  id: string;
  jobTitle: string;
  company: string;
  companyLogoUri?: string;
  employmentType: WorkType;
  location: string;
  startDate: string; // ISO
  endDate?: string; // ISO
  isCurrent: boolean;
  description?: string;
  responsibilities: string[];
  achievements: string[];
  salary?: number;
  skillsUsed: string[];
};

export type CandidateSkill = { id: string; skillId?: string; name: string; level: SkillLevel; yearsExperience?: number };
export type CandidateLanguage = { id: string; language: string; speaking: LanguageLevel; writing: LanguageLevel; reading: LanguageLevel; overall: LanguageLevel };
export type Certification = { id: string; name: string; issuer: string; issueDate: string; expiryDate?: string; credentialId?: string; credentialUrl?: string; fileUri?: string };
export type Course = { id: string; name: string; provider: string; startDate: string; completionDate?: string; description?: string; certificateUri?: string; skillsGained: string[] };
export type Project = { id: string; name: string; role: string; description: string; startDate: string; endDate?: string; technologies: string[]; url?: string; imageUris: string[] };
export type PortfolioItem = { id: string; title: string; description: string; imageUris: string[]; videoUrl?: string; url?: string; category?: string; skills: string[] };

export type ResumeFile = {
  id: string;
  name: string; // اسم بيدّيه المستخدم زي "سيرة ذاتية محاسبة"
  uri: string;
  fileType: 'pdf' | 'doc' | 'docx';
  sizeBytes: number;
  uploadedAt: string;
  isPrimary: boolean;
};

export type ResumeTemplate = 'modern' | 'classic' | 'professional' | 'minimal' | 'executive';
export type GeneratedResume = { id: string; name: string; template: ResumeTemplate; createdAt: string; isPrimary: boolean };

/** CV/السيرة اللي بترفعها والـCV اللي بتتولّد من البيانات المُهيكلة —
 * PART 15: قصدًا نوعين مختلفين، مش نفس الحاجة. */
export type Resume = { files: ResumeFile[]; generated: GeneratedResume[] };

export type CareerProfile = {
  sellerId: 'me';
  fullName: string;
  photoUri?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  phone?: string;
  email?: string;
  governorate?: string;
  city?: string;
  area?: string;
  address?: string;
  nationality?: string;

  currentJobTitle?: string;
  desiredJobTitle?: string;
  professionId?: string;
  industry?: string;
  yearsExperience?: number;
  careerLevel?: CareerLevel;
  employmentStatus?: string;
  availability?: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  preferredWorkTypes: WorkType[];

  education: Education[];
  experience: Experience[];
  skills: CandidateSkill[];
  languages: CandidateLanguage[];
  certifications: Certification[];
  courses: Course[];
  projects: Project[];
  portfolio: PortfolioItem[];

  resume: Resume;

  visibility: ProfileVisibility;
  showPhone: boolean;
  showEmail: boolean;
  showCv: boolean;
  allowRecruiterContact: boolean;

  createdAt: string;
  updatedAt: string;
};

// ============================================================ الوظيفة
export type ApplicationMethod = 'in_app' | 'external_url' | 'email';

export type Job = {
  id: string;
  title: string;
  companyId: string;
  categoryId: string;
  professionId?: string;
  workType: WorkType;
  careerLevel?: CareerLevel;
  city: string;
  area?: string;
  locationId?: string; // من mock/taxonomy/locations — بيسمح بإعادة فتح شاشة الموقع وقت التعديل بدل ما نفقد الدقة ونرجع للمحافظة بس
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryHidden: boolean;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  benefits: string[];
  applicationMethod: ApplicationMethod;
  applicationUrl?: string;
  applicationEmail?: string;
  postedAt: string; // ISO
  deadline?: string; // ISO
  status: JobStatus;
  isFeatured: boolean;
  isUrgent: boolean;
  views: number;
  applicationsCount: number;
};

// ============================================================ التقديم
export type JobApplication = {
  id: string;
  jobId: string;
  candidateSellerId: string; // 'me' دايمًا حاليًا (المتقدّم)
  resumeFileId?: string;
  generatedResumeId?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  appliedAt: string;
  timeline: { status: ApplicationStatus; at: string }[];
};

export type SavedJob = { id: string; jobId: string; savedAt: string };

export type JobAlert = {
  id: string;
  keywords?: string;
  professionId?: string;
  city?: string;
  salaryMin?: number;
  salaryMax?: number;
  workType?: WorkType;
  remote?: boolean;
  careerLevel?: CareerLevel;
  createdAt: string;
};

export type Interview = {
  id: string;
  applicationId: string;
  jobId: string;
  candidateSellerId: string;
  date: string; // ISO
  time: string; // "10:30 ص"
  location?: string;
  mode: 'online' | 'in_person';
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};

// ============================================================ المحترفين والخدمات (منفصل عن الوظائف)
export type ProfessionalProfile = {
  sellerId: 'me';
  name: string;
  tradeId?: string;
  photoUri?: string;
  description: string;
  yearsExperience?: number;
  skills: string[];
  serviceAreas: string[]; // أسماء مناطق حقيقية من mock/taxonomy/locations
  priceStartingFrom?: number;
  availability?: string;
  workingHours?: string;
  phone?: string;
  whatsapp?: string;
  photoUris: string[];
  portfolio: PortfolioItem[];
  verification: JobsVerificationStatus;
  createdAt: string;
};

export type PriceType = 'fixed' | 'starting_from' | 'hourly' | 'negotiable';
export type ServiceStatus = 'active' | 'paused' | 'deleted';

export type Service = {
  id: string;
  professionalSellerId: string; // 'me' دايمًا حاليًا
  categoryId: string;
  tradeId?: string;
  title: string;
  description: string;
  price?: number;
  priceType: PriceType;
  serviceAreas: string[];
  duration?: string;
  imageUris: string[];
  availability?: string;
  postedAt: string;
  status: ServiceStatus;
  offerPrice?: number; // عرض خاص مؤقت — لو موجود بيتعرض بدل price
  offerEndsAt?: string; // ISO
};

// ============================================================ بلاغات (وظائف/شركات/محترفين/خدمات)
export type JobsReportReason = 'fake' | 'scam' | 'wrong_category' | 'duplicate' | 'prohibited' | 'spam' | 'abusive' | 'incorrect_info';
export type JobsReportTargetType = 'job' | 'company' | 'professional' | 'service';
export type JobsReport = {
  id: string;
  targetType: JobsReportTargetType;
  targetId: string;
  reason: JobsReportReason;
  createdAt: string; // ISO
};

// ============================================================ تقييمات (شركات/محترفين/خدمات)
export type JobsReviewTargetType = 'company' | 'professional' | 'service';
export type JobsReview = {
  id: string;
  targetType: JobsReviewTargetType;
  targetId: string;
  rating: number; // 1-5
  comment: string;
  reviewerName: string;
  createdAt: string;
};
