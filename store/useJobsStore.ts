/**
 * store/useJobsStore.ts
 *
 * ستيت منفصل لنظام "الوظائف والمهن والخدمات" — زي useAppStore بالظبط
 * (zustand، محلي بالكامل، مفيش بيانات بذرة وهمية) بس في ملف لوحده عشان
 * useAppStore ميبقاش ضخم أوي. أي باك إند ERP لاحقًا هيستبدل كل action
 * هنا بنداء API بنفس التوقيع من غير ما الشاشات تتغيّر.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  companies as seedCompanies,
  jobs as seedJobs,
  jobsReviews as seedReviews,
  services as seedServices,
} from '@/mock/jobs/data';
import type {
  CandidateLanguage,
  CandidateSkill,
  CareerProfile,
  Certification,
  Company,
  Course,
  Education,
  Experience,
  GeneratedResume,
  Interview,
  Job,
  JobAlert,
  JobApplication,
  ApplicationStatus,
  JobsReport,
  JobsReportReason,
  JobsReportTargetType,
  JobsReview,
  PortfolioItem,
  ProfessionalProfile,
  Project,
  ResumeFile,
  SavedJob,
  Service,
} from '@/mock/jobs/types';

const emptyCareerProfile: CareerProfile = {
  sellerId: 'me',
  fullName: '',
  preferredWorkTypes: [],
  education: [],
  experience: [],
  skills: [],
  languages: [],
  certifications: [],
  courses: [],
  projects: [],
  portfolio: [],
  resume: { files: [], generated: [] },
  visibility: 'employers_only',
  showPhone: false,
  showEmail: false,
  showCv: true,
  allowRecruiterContact: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

type JobsState = {
  // ---- شركات (حسابات توظيف حقيقية اتعملت من التطبيق) ----
  userCompanies: Company[];
  addCompany: (c: Omit<Company, 'id' | 'ownerSellerId' | 'verification' | 'createdAt'>) => string;
  updateCompany: (id: string, patch: Partial<Company>) => void;

  // ---- وظائف حقيقية اتنشرت ----
  userJobs: Job[];
  addJob: (j: Omit<Job, 'id' | 'postedAt' | 'status' | 'views' | 'applicationsCount' | 'isFeatured'>) => string;
  updateJob: (id: string, patch: Partial<Job>) => void;
  setJobStatus: (id: string, status: Job['status']) => void;
  removeJob: (id: string) => void;
  incrementJobViews: (id: string) => void;

  // ---- الملف المهني (Career Profile) — واحد للمستخدم الحالي ----
  careerProfile: CareerProfile | null;
  ensureCareerProfile: () => void;
  updateCareerProfile: (patch: Partial<CareerProfile>) => void;
  addEducation: (e: Omit<Education, 'id'>) => void;
  removeEducation: (id: string) => void;
  updateEducation: (id: string, patch: Partial<Education>) => void;
  addExperience: (e: Omit<Experience, 'id'>) => void;
  removeExperience: (id: string) => void;
  updateExperience: (id: string, patch: Partial<Experience>) => void;
  addCandidateSkill: (s: Omit<CandidateSkill, 'id'>) => void;
  removeCandidateSkill: (id: string) => void;
  addCandidateLanguage: (l: Omit<CandidateLanguage, 'id'>) => void;
  removeCandidateLanguage: (id: string) => void;
  addCertification: (c: Omit<Certification, 'id'>) => void;
  removeCertification: (id: string) => void;
  addCourse: (c: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  addProject: (p: Omit<Project, 'id'>) => void;
  removeProject: (id: string) => void;
  addPortfolioItem: (p: Omit<PortfolioItem, 'id'>) => void;
  removePortfolioItem: (id: string) => void;
  addResumeFile: (f: Omit<ResumeFile, 'id' | 'uploadedAt' | 'isPrimary'>) => void;
  removeResumeFile: (id: string) => void;
  setPrimaryResumeFile: (id: string) => void;
  addGeneratedResume: (r: Omit<GeneratedResume, 'id' | 'createdAt' | 'isPrimary'>) => void;
  removeGeneratedResume: (id: string) => void;

  // ---- تقديمات ----
  applications: JobApplication[];
  applyToJob: (jobId: string, resumeFileId?: string, generatedResumeId?: string, coverLetter?: string) => void;
  hasAppliedToJob: (jobId: string) => boolean;
  withdrawApplication: (id: string) => void;
  setApplicationStatus: (id: string, status: ApplicationStatus) => void;

  // ---- إعلانات محفوظة وتنبيهات ----
  savedJobs: SavedJob[];
  toggleSaveJob: (jobId: string) => void;
  isJobSaved: (jobId: string) => boolean;

  jobAlerts: JobAlert[];
  addJobAlert: (a: Omit<JobAlert, 'id' | 'createdAt'>) => void;
  removeJobAlert: (id: string) => void;

  // ---- مقابلات ----
  interviews: Interview[];
  scheduleInterview: (i: Omit<Interview, 'id' | 'status'>) => void;
  setInterviewStatus: (id: string, status: Interview['status']) => void;

  // ---- المحترفين والخدمات ----
  professionalProfile: ProfessionalProfile | null;
  setProfessionalProfile: (p: Omit<ProfessionalProfile, 'sellerId' | 'verification' | 'createdAt'>) => void;

  userServices: Service[];
  addService: (s: Omit<Service, 'id' | 'professionalSellerId' | 'postedAt' | 'status'>) => string;
  updateService: (id: string, patch: Partial<Service>) => void;
  removeService: (id: string) => void;

  jobsReviewsList: JobsReview[];
  addJobsReview: (r: Omit<JobsReview, 'id' | 'createdAt'>) => void;

  jobsReports: JobsReport[];
  reportJobsTarget: (targetType: JobsReportTargetType, targetId: string, reason: JobsReportReason) => void;
  hasReportedJobsTarget: (targetType: JobsReportTargetType, targetId: string) => boolean;
};

let counter = 1;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

/** PART QA-fix (Phase 5): نفس مشكلة useAppStore بالظبط — الستور ده كان
 * كمان من غير persist خالص، يعني ملف الوظائف/الشركة/CV/التقديمات كله
 * كان بيتمسح لو التطبيق اتقفل. */
export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
  userCompanies: [],
  addCompany: (c) => {
    const id = nextId('co');
    set((s) => ({ userCompanies: [{ id, ownerSellerId: 'me', verification: 'pending', createdAt: new Date().toISOString(), ...c }, ...s.userCompanies] }));
    return id;
  },
  updateCompany: (id, patch) => set((s) => ({ userCompanies: s.userCompanies.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  userJobs: [],
  addJob: (j) => {
    const id = nextId('job');
    set((s) => ({
      userJobs: [{ id, postedAt: new Date().toISOString(), status: 'published', views: 0, applicationsCount: 0, isFeatured: false, ...j }, ...s.userJobs],
    }));
    return id;
  },
  updateJob: (id, patch) => set((s) => ({ userJobs: s.userJobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
  setJobStatus: (id, status) => set((s) => ({ userJobs: s.userJobs.map((j) => (j.id === id ? { ...j, status } : j)) })),
  removeJob: (id) => set((s) => ({ userJobs: s.userJobs.filter((j) => j.id !== id) })),
  incrementJobViews: (id) => set((s) => ({ userJobs: s.userJobs.map((j) => (j.id === id ? { ...j, views: j.views + 1 } : j)) })),

  careerProfile: null,
  ensureCareerProfile: () => set((s) => (s.careerProfile ? s : { careerProfile: { ...emptyCareerProfile } })),
  updateCareerProfile: (patch) =>
    set((s) => ({ careerProfile: { ...(s.careerProfile ?? emptyCareerProfile), ...patch, updatedAt: new Date().toISOString() } })),
  addEducation: (e) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      return { careerProfile: { ...cp, education: [{ id: nextId('ed'), ...e }, ...cp.education], updatedAt: new Date().toISOString() } };
    }),
  removeEducation: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, education: s.careerProfile.education.filter((e) => e.id !== id) } } : s)),
  updateEducation: (id, patch) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, education: s.careerProfile.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) } } : s)),
  addExperience: (e) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      return { careerProfile: { ...cp, experience: [{ id: nextId('exp'), ...e }, ...cp.experience], updatedAt: new Date().toISOString() } };
    }),
  removeExperience: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, experience: s.careerProfile.experience.filter((e) => e.id !== id) } } : s)),
  updateExperience: (id, patch) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, experience: s.careerProfile.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)) } } : s)),
  addCandidateSkill: (skl) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      return { careerProfile: { ...cp, skills: [{ id: nextId('sk'), ...skl }, ...cp.skills] } };
    }),
  removeCandidateSkill: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, skills: s.careerProfile.skills.filter((sk) => sk.id !== id) } } : s)),
  addCandidateLanguage: (l) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      return { careerProfile: { ...cp, languages: [{ id: nextId('lg'), ...l }, ...cp.languages] } };
    }),
  removeCandidateLanguage: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, languages: s.careerProfile.languages.filter((l) => l.id !== id) } } : s)),
  addCertification: (c) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      return { careerProfile: { ...cp, certifications: [{ id: nextId('cert'), ...c }, ...cp.certifications] } };
    }),
  removeCertification: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, certifications: s.careerProfile.certifications.filter((c) => c.id !== id) } } : s)),
  addCourse: (c) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      return { careerProfile: { ...cp, courses: [{ id: nextId('crs'), ...c }, ...cp.courses] } };
    }),
  removeCourse: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, courses: s.careerProfile.courses.filter((c) => c.id !== id) } } : s)),
  addProject: (p) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      return { careerProfile: { ...cp, projects: [{ id: nextId('prj'), ...p }, ...cp.projects] } };
    }),
  removeProject: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, projects: s.careerProfile.projects.filter((p) => p.id !== id) } } : s)),
  addPortfolioItem: (p) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      return { careerProfile: { ...cp, portfolio: [{ id: nextId('pf'), ...p }, ...cp.portfolio] } };
    }),
  removePortfolioItem: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, portfolio: s.careerProfile.portfolio.filter((p) => p.id !== id) } } : s)),
  addResumeFile: (f) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      const isFirst = cp.resume.files.length === 0;
      const file: ResumeFile = { id: nextId('cv'), uploadedAt: new Date().toISOString(), isPrimary: isFirst, ...f };
      return { careerProfile: { ...cp, resume: { ...cp.resume, files: [file, ...cp.resume.files] } } };
    }),
  removeResumeFile: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, resume: { ...s.careerProfile.resume, files: s.careerProfile.resume.files.filter((f) => f.id !== id) } } } : s)),
  setPrimaryResumeFile: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, resume: { ...s.careerProfile.resume, files: s.careerProfile.resume.files.map((f) => ({ ...f, isPrimary: f.id === id })) } } } : s)),
  addGeneratedResume: (r) =>
    set((s) => {
      const cp = s.careerProfile ?? emptyCareerProfile;
      const isFirst = cp.resume.generated.length === 0;
      const gen: GeneratedResume = { id: nextId('gcv'), createdAt: new Date().toISOString(), isPrimary: isFirst, ...r };
      return { careerProfile: { ...cp, resume: { ...cp.resume, generated: [gen, ...cp.resume.generated] } } };
    }),
  removeGeneratedResume: (id) =>
    set((s) => (s.careerProfile ? { careerProfile: { ...s.careerProfile, resume: { ...s.careerProfile.resume, generated: s.careerProfile.resume.generated.filter((g) => g.id !== id) } } } : s)),

  applications: [],
  applyToJob: (jobId, resumeFileId, generatedResumeId, coverLetter) => {
    if (get().applications.some((a) => a.jobId === jobId)) return;
    const now = new Date().toISOString();
    set((s) => ({
      applications: [
        { id: nextId('app'), jobId, candidateSellerId: 'me', resumeFileId, generatedResumeId, coverLetter, status: 'applied', appliedAt: now, timeline: [{ status: 'applied', at: now }] },
        ...s.applications,
      ],
      userJobs: s.userJobs.map((j) => (j.id === jobId ? { ...j, applicationsCount: j.applicationsCount + 1 } : j)),
    }));
  },
  hasAppliedToJob: (jobId) => get().applications.some((a) => a.jobId === jobId),
  withdrawApplication: (id) =>
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? { ...a, status: 'withdrawn', timeline: [...a.timeline, { status: 'withdrawn', at: new Date().toISOString() }] } : a)),
    })),
  setApplicationStatus: (id, status) =>
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? { ...a, status, timeline: [...a.timeline, { status, at: new Date().toISOString() }] } : a)),
    })),

  savedJobs: [],
  toggleSaveJob: (jobId) =>
    set((s) => {
      const existing = s.savedJobs.find((sj) => sj.jobId === jobId);
      if (existing) return { savedJobs: s.savedJobs.filter((sj) => sj.jobId !== jobId) };
      return { savedJobs: [{ id: nextId('sv'), jobId, savedAt: new Date().toISOString() }, ...s.savedJobs] };
    }),
  isJobSaved: (jobId) => get().savedJobs.some((sj) => sj.jobId === jobId),

  jobAlerts: [],
  addJobAlert: (a) => set((s) => ({ jobAlerts: [{ id: nextId('al'), createdAt: new Date().toISOString(), ...a }, ...s.jobAlerts] })),
  removeJobAlert: (id) => set((s) => ({ jobAlerts: s.jobAlerts.filter((a) => a.id !== id) })),

  interviews: [],
  scheduleInterview: (i) => set((s) => ({ interviews: [{ id: nextId('iv'), status: 'scheduled', ...i }, ...s.interviews] })),
  setInterviewStatus: (id, status) => set((s) => ({ interviews: s.interviews.map((i) => (i.id === id ? { ...i, status } : i)) })),

  professionalProfile: null,
  setProfessionalProfile: (p) =>
    set((s) => ({ professionalProfile: { sellerId: 'me', verification: s.professionalProfile?.verification ?? 'unverified', createdAt: s.professionalProfile?.createdAt ?? new Date().toISOString(), ...p } })),

  userServices: [],
  addService: (svc) => {
    const id = nextId('sv');
    set((s) => ({ userServices: [{ id, professionalSellerId: 'me', postedAt: new Date().toISOString(), status: 'active', ...svc }, ...s.userServices] }));
    return id;
  },
  updateService: (id, patch) => set((s) => ({ userServices: s.userServices.map((sv) => (sv.id === id ? { ...sv, ...patch } : sv)) })),
  removeService: (id) => set((s) => ({ userServices: s.userServices.filter((sv) => sv.id !== id) })),

  jobsReviewsList: [],
  addJobsReview: (r) => set((s) => ({ jobsReviewsList: [{ id: nextId('rv'), createdAt: new Date().toISOString(), ...r }, ...s.jobsReviewsList] })),

  jobsReports: [],
  reportJobsTarget: (targetType, targetId, reason) =>
    set((s) => ({ jobsReports: [{ id: nextId('rp'), targetType, targetId, reason, createdAt: new Date().toISOString() }, ...s.jobsReports] })),
  hasReportedJobsTarget: (targetType, targetId) => get().jobsReports.some((r) => r.targetType === targetType && r.targetId === targetId),
    }),
    {
      // نفس قرار useAppStore.ts — الاسم القديم متعمّد، مش نسيان. شوف
      // التعليق هناك.
      name: 'mazad-jobs-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

// ============================================================ Hooks مساعدة
export function useAllJobs(): Job[] {
  const userJobs = useJobsStore((s) => s.userJobs);
  return [...userJobs, ...seedJobs];
}
export function useJobById(id: string | undefined): Job | undefined {
  const all = useAllJobs();
  return id ? all.find((j) => j.id === id) : undefined;
}
export function useAllCompanies(): Company[] {
  const userCompanies = useJobsStore((s) => s.userCompanies);
  return [...userCompanies, ...seedCompanies];
}
export function useCompanyById(id: string | undefined): Company | undefined {
  const all = useAllCompanies();
  return id ? all.find((c) => c.id === id) : undefined;
}
export function useAllServices(): Service[] {
  const userServices = useJobsStore((s) => s.userServices);
  return [...userServices, ...seedServices];
}
export function useServiceById(id: string | undefined): Service | undefined {
  const all = useAllServices();
  return id ? all.find((s) => s.id === id) : undefined;
}
export function useJobsReviewsFor(targetType: JobsReview['targetType'], targetId: string | undefined): JobsReview[] {
  const local = useJobsStore((s) => s.jobsReviewsList);
  if (!targetId) return [];
  return [...local, ...seedReviews].filter((r) => r.targetType === targetType && r.targetId === targetId);
}

export default useJobsStore;
