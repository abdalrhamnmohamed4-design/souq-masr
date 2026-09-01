/**
 * src/store/useAdminStore.ts
 *
 * ستيت واحد لكل الداشبورد — بيبدأ من نفس الـ mock/ بتاع البيانات، وكل
 * إجراء (ban/approve/resolve...) بيعدّل النسخة المحلية في الذاكرة. أي
 * باك إند حقيقي لاحقًا هيستبدل الأفعال دي بنداءات API بنفس التوقيع.
 */
import { create } from 'zustand';
import { adminAccounts } from '@/mock/adminAccounts';
import { banners as seedBanners } from '@/mock/banners';
import { boostServices as seedBoostServices } from '@/mock/boostServices';
import { businesses as seedBusinesses } from '@/mock/businesses';
import { notificationCampaigns as seedNotifications } from '@/mock/notifications';
import { payments as seedPayments } from '@/mock/payments';
import { paymentNumbers as seedPaymentNumbers } from '@/mock/paymentNumbers';
import { promoCodes as seedPromoCodes } from '@/mock/promoCodes';
import { reportedChats as seedReportedChats } from '@/mock/reportedChats';
import { reports as seedReports } from '@/mock/reports';
import { defaultSettings } from '@/mock/settings';
import { users as seedUsers } from '@/mock/users';
import { listings as seedListings } from '@/mock/listings';
import { brands as seedBrands } from '@/mock/taxonomy/brands';
import { categories as seedCategories } from '@/mock/taxonomy/categories';
import { locations as seedLocations } from '@/mock/taxonomy/locations';
import { models as seedModels } from '@/mock/taxonomy/models';
import type { Brand, Category, CategoryField, LocationNode, Model } from '@/mock/taxonomy/types';
import { jobCategories as seedJobCategories, professions as seedProfessions } from '@/mock/jobs/categories';
import { serviceCategories as seedServiceCategories, trades as seedTrades } from '@/mock/jobs/trades';
import { skills as seedJobsSkills } from '@/mock/jobs/skills';
import {
  applications as seedJobApplications,
  candidates as seedCandidates,
  companies as seedJobCompanies,
  jobs as seedJobsData,
  jobsReports as seedJobsReports,
  professionals as seedProfessionals,
  services as seedJobsServices,
} from '@/mock/jobs/data';
import type {
  CandidateSummary,
  Company as JobCompany,
  Job,
  JobApplicationSummary,
  JobCategory,
  JobsReport,
  JobStatus,
  JobsVerificationStatus,
  Profession,
  ProfessionalProfileSummary,
  ReportStatus,
  Service,
  ServiceCategory,
  ServiceStatus,
  Skill,
  Trade,
} from '@/mock/jobs/types';
import type {
  AdminAccount,
  AdminListing,
  AppSettings,
  Banner,
  BoostService,
  BusinessAccount,
  MarketplaceUser,
  NotificationCampaign,
  PaymentNumber,
  PromoCode,
  Report,
  ReportedChat,
  UserStatus,
} from '@/types';

type AdminState = {
  currentAdmin: AdminAccount;
  setCurrentAdmin: (id: string) => void;

  users: MarketplaceUser[];
  setUserStatus: (id: string, status: UserStatus) => void;
  toggleVerified: (id: string) => void;
  deleteUser: (id: string) => void;

  listings: AdminListing[];
  setListingStatus: (id: string, status: AdminListing['status']) => void;
  toggleFeatured: (id: string) => void;
  deleteListing: (id: string) => void;

  reports: Report[];
  setReportStatus: (id: string, status: Report['status'], notes?: string) => void;

  reportedChats: ReportedChat[];
  setChatStatus: (id: string, status: ReportedChat['status']) => void;

  boostServices: BoostService[];
  updateBoostPrice: (id: string, price: number) => void;
  toggleBoostActive: (id: string) => void;

  payments: typeof seedPayments;

  paymentNumbers: PaymentNumber[];
  addPaymentNumber: (p: Omit<PaymentNumber, 'id' | 'active'>) => void;
  updatePaymentNumber: (id: string, patch: Partial<PaymentNumber>) => void;
  removePaymentNumber: (id: string) => void;
  togglePaymentNumberActive: (id: string) => void;

  businesses: BusinessAccount[];
  setBusinessStatus: (id: string, status: BusinessAccount['status']) => void;

  categories: Category[];
  addCategory: (c: Omit<Category, 'fields' | 'active'> & { fields?: CategoryField[] }) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  toggleCategoryActive: (id: string) => void;
  reorderCategory: (id: string, direction: 'up' | 'down') => void;
  addCategoryField: (categoryId: string, field: CategoryField) => void;
  removeCategoryField: (categoryId: string, fieldKey: string) => void;

  brands: Brand[];
  addBrand: (b: Brand) => void;
  removeBrand: (id: string) => void;
  updateBrand: (id: string, patch: Partial<Brand>) => void;

  models: Model[];
  addModel: (m: Model) => void;
  removeModel: (id: string) => void;

  locations: LocationNode[];
  addLocation: (l: LocationNode) => void;
  removeLocation: (id: string) => void;

  promoCodes: PromoCode[];
  addPromoCode: (p: PromoCode) => void;
  togglePromoActive: (id: string) => void;
  removePromoCode: (id: string) => void;

  notifications: NotificationCampaign[];
  sendNotification: (n: Omit<NotificationCampaign, 'id' | 'status' | 'sentAt' | 'recipientsCount'>) => void;
  saveDraftNotification: (n: Omit<NotificationCampaign, 'id' | 'status' | 'sentAt' | 'recipientsCount'>) => void;

  banners: Banner[];
  toggleBannerActive: (id: string) => void;
  addBanner: (b: Banner) => void;
  removeBanner: (id: string) => void;

  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // ---- الوظائف والمهن (PART 37/38) ----
  jobCategories: JobCategory[];
  addJobCategory: (c: Omit<JobCategory, 'parentId' | 'order'>) => void;
  removeJobCategory: (id: string) => void;
  updateJobCategory: (id: string, patch: Partial<JobCategory>) => void;

  professions: Profession[];
  addProfession: (p: Profession) => void;
  removeProfession: (id: string) => void;

  serviceCategories: ServiceCategory[];
  addServiceCategory: (c: Omit<ServiceCategory, 'parentId' | 'order'>) => void;
  removeServiceCategory: (id: string) => void;
  updateServiceCategory: (id: string, patch: Partial<ServiceCategory>) => void;

  trades: Trade[];
  addTrade: (t: Trade) => void;
  removeTrade: (id: string) => void;

  jobsSkills: Skill[];
  addSkill: (s: Omit<Skill, 'id'>) => void;
  removeSkill: (id: string) => void;

  jobs: Job[];
  setJobStatus: (id: string, status: JobStatus) => void;
  toggleJobFeatured: (id: string) => void;
  removeJobAdmin: (id: string) => void;

  jobCompanies: JobCompany[];
  setJobCompanyVerification: (id: string, v: JobsVerificationStatus) => void;

  candidates: CandidateSummary[];
  professionals: ProfessionalProfileSummary[];
  setProfessionalVerification: (id: string, v: JobsVerificationStatus) => void;

  jobsServices: Service[];
  setJobsServiceStatus: (id: string, status: ServiceStatus) => void;

  jobApplications: JobApplicationSummary[];

  jobsReports: JobsReport[];
  setJobsReportStatus: (id: string, status: ReportStatus, notes?: string) => void;
};

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

export const useAdminStore = create<AdminState>((set) => ({
  currentAdmin: adminAccounts[0],
  setCurrentAdmin: (id) =>
    set((s) => ({ currentAdmin: adminAccounts.find((a) => a.id === id) ?? s.currentAdmin })),

  users: seedUsers,
  setUserStatus: (id, status) =>
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) })),
  toggleVerified: (id) =>
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, verified: !u.verified } : u)) })),
  deleteUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

  listings: seedListings,
  setListingStatus: (id, status) =>
    set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, status } : l)) })),
  toggleFeatured: (id) =>
    set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, featured: !l.featured } : l)) })),
  deleteListing: (id) => set((s) => ({ listings: s.listings.filter((l) => l.id !== id) })),

  reports: seedReports,
  setReportStatus: (id, status, notes) =>
    set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, status, notes: notes ?? r.notes } : r)) })),

  reportedChats: seedReportedChats,
  setChatStatus: (id, status) =>
    set((s) => ({ reportedChats: s.reportedChats.map((c) => (c.id === id ? { ...c, status } : c)) })),

  boostServices: seedBoostServices,
  updateBoostPrice: (id, price) =>
    set((s) => ({ boostServices: s.boostServices.map((b) => (b.id === id ? { ...b, priceEGP: price } : b)) })),
  toggleBoostActive: (id) =>
    set((s) => ({ boostServices: s.boostServices.map((b) => (b.id === id ? { ...b, active: !b.active } : b)) })),

  payments: seedPayments,

  paymentNumbers: seedPaymentNumbers,
  addPaymentNumber: (p) =>
    set((s) => ({ paymentNumbers: [{ id: `pn-${Date.now()}`, active: true, ...p }, ...s.paymentNumbers] })),
  updatePaymentNumber: (id, patch) =>
    set((s) => ({ paymentNumbers: s.paymentNumbers.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  removePaymentNumber: (id) => set((s) => ({ paymentNumbers: s.paymentNumbers.filter((p) => p.id !== id) })),
  togglePaymentNumberActive: (id) =>
    set((s) => ({ paymentNumbers: s.paymentNumbers.map((p) => (p.id === id ? { ...p, active: !p.active } : p)) })),

  businesses: seedBusinesses,
  setBusinessStatus: (id, status) =>
    set((s) => ({ businesses: s.businesses.map((b) => (b.id === id ? { ...b, status } : b)) })),

  categories: seedCategories,
  addCategory: (c) => set((s) => ({ categories: [...s.categories, { ...c, fields: c.fields ?? [], active: true }] })),
  removeCategory: (id) =>
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id && c.parentId !== id) })),
  updateCategory: (id, patch) =>
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  toggleCategoryActive: (id) =>
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, active: !c.active } : c)) })),
  reorderCategory: (id, direction) =>
    set((s) => {
      const siblings = s.categories.filter((c) => c.parentId === s.categories.find((x) => x.id === id)?.parentId).sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((c) => c.id === id);
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swapWith < 0 || swapWith >= siblings.length) return {};
      const aId = siblings[idx].id;
      const bId = siblings[swapWith].id;
      const aOrder = siblings[idx].order;
      const bOrder = siblings[swapWith].order;
      return {
        categories: s.categories.map((c) => (c.id === aId ? { ...c, order: bOrder } : c.id === bId ? { ...c, order: aOrder } : c)),
      };
    }),
  addCategoryField: (categoryId, field) =>
    set((s) => ({ categories: s.categories.map((c) => (c.id === categoryId ? { ...c, fields: [...c.fields, field] } : c)) })),
  removeCategoryField: (categoryId, fieldKey) =>
    set((s) => ({ categories: s.categories.map((c) => (c.id === categoryId ? { ...c, fields: c.fields.filter((f) => f.key !== fieldKey) } : c)) })),

  brands: seedBrands,
  addBrand: (b) => set((s) => ({ brands: [...s.brands, b] })),
  removeBrand: (id) => set((s) => ({ brands: s.brands.filter((b) => b.id !== id), models: s.models.filter((m) => m.brandId !== id) })),
  updateBrand: (id, patch) => set((s) => ({ brands: s.brands.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

  models: seedModels,
  addModel: (m) => set((s) => ({ models: [...s.models, m] })),
  removeModel: (id) => set((s) => ({ models: s.models.filter((m) => m.id !== id) })),

  locations: seedLocations,
  addLocation: (l) => set((s) => ({ locations: [...s.locations, l] })),
  removeLocation: (id) => set((s) => ({ locations: s.locations.filter((l) => l.id !== id) })),

  promoCodes: seedPromoCodes,
  addPromoCode: (p) => set((s) => ({ promoCodes: [p, ...s.promoCodes] })),
  togglePromoActive: (id) =>
    set((s) => ({ promoCodes: s.promoCodes.map((p) => (p.id === id ? { ...p, active: !p.active } : p)) })),
  removePromoCode: (id) => set((s) => ({ promoCodes: s.promoCodes.filter((p) => p.id !== id) })),

  notifications: seedNotifications,
  sendNotification: (n) =>
    set((s) => ({
      notifications: [
        {
          ...n,
          id: nextId('n'),
          status: 'sent',
          sentAt: new Date().toISOString(),
          recipientsCount: Math.floor(Math.random() * 9000) + 500,
        },
        ...s.notifications,
      ],
    })),
  saveDraftNotification: (n) =>
    set((s) => ({
      notifications: [{ ...n, id: nextId('n'), status: 'draft', recipientsCount: 0 }, ...s.notifications],
    })),

  banners: seedBanners,
  toggleBannerActive: (id) =>
    set((s) => ({ banners: s.banners.map((b) => (b.id === id ? { ...b, active: !b.active } : b)) })),
  addBanner: (b) => set((s) => ({ banners: [b, ...s.banners] })),
  removeBanner: (id) => set((s) => ({ banners: s.banners.filter((b) => b.id !== id) })),

  settings: defaultSettings,
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  jobCategories: seedJobCategories,
  addJobCategory: (c) => set((s) => ({ jobCategories: [...s.jobCategories, { ...c, parentId: null, order: s.jobCategories.length + 1 }] })),
  removeJobCategory: (id) =>
    set((s) => ({ jobCategories: s.jobCategories.filter((c) => c.id !== id), professions: s.professions.filter((p) => p.categoryId !== id) })),
  updateJobCategory: (id, patch) => set((s) => ({ jobCategories: s.jobCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  professions: seedProfessions,
  addProfession: (p) => set((s) => ({ professions: [...s.professions, p] })),
  removeProfession: (id) => set((s) => ({ professions: s.professions.filter((p) => p.id !== id) })),

  serviceCategories: seedServiceCategories,
  addServiceCategory: (c) => set((s) => ({ serviceCategories: [...s.serviceCategories, { ...c, parentId: null, order: s.serviceCategories.length + 1 }] })),
  removeServiceCategory: (id) =>
    set((s) => ({ serviceCategories: s.serviceCategories.filter((c) => c.id !== id), trades: s.trades.filter((t) => t.categoryId !== id) })),
  updateServiceCategory: (id, patch) => set((s) => ({ serviceCategories: s.serviceCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  trades: seedTrades,
  addTrade: (t) => set((s) => ({ trades: [...s.trades, t] })),
  removeTrade: (id) => set((s) => ({ trades: s.trades.filter((t) => t.id !== id) })),

  jobsSkills: seedJobsSkills,
  addSkill: (skl) => set((s) => ({ jobsSkills: [...s.jobsSkills, { id: nextId('sk'), ...skl }] })),
  removeSkill: (id) => set((s) => ({ jobsSkills: s.jobsSkills.filter((sk) => sk.id !== id) })),

  jobs: seedJobsData,
  setJobStatus: (id, status) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, status } : j)) })),
  toggleJobFeatured: (id) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, isFeatured: !j.isFeatured } : j)) })),
  removeJobAdmin: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),

  jobCompanies: seedJobCompanies,
  setJobCompanyVerification: (id, v) => set((s) => ({ jobCompanies: s.jobCompanies.map((c) => (c.id === id ? { ...c, verification: v } : c)) })),

  candidates: seedCandidates,
  professionals: seedProfessionals,
  setProfessionalVerification: (id, v) => set((s) => ({ professionals: s.professionals.map((p) => (p.id === id ? { ...p, verification: v } : p)) })),

  jobsServices: seedJobsServices,
  setJobsServiceStatus: (id, status) => set((s) => ({ jobsServices: s.jobsServices.map((sv) => (sv.id === id ? { ...sv, status } : sv)) })),

  jobApplications: seedJobApplications,

  jobsReports: seedJobsReports,
  setJobsReportStatus: (id, status, notes) =>
    set((s) => ({ jobsReports: s.jobsReports.map((r) => (r.id === id ? { ...r, status, notes: notes ?? r.notes } : r)) })),
}));

export default useAdminStore;
