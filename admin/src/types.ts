/**
 * src/types.ts — الكيانات المشتركة لكل أقسام داشبورد الأدمن. البيانات
 * كلها محلية (mock/) دلوقتي — الأنواع دي هي اللي هتبقى عقد الـ API لما
 * يتوصل باك إند حقيقي لاحقًا.
 */

export type AdminRole = 'super_admin' | 'moderator' | 'finance' | 'support' | 'marketing';

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  initials: string;
  active: boolean;
  lastLogin: string;
};

export type UserStatus = 'active' | 'suspended' | 'banned';

export type MarketplaceUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  joinedAt: string;
  lastActiveAt: string;
  adsCount: number;
  viewsTotal: number;
  reportsAgainst: number;
  verified: boolean;
  status: UserStatus;
  riskScore: number; // 0-100، محسوبة محليًا (بلاغات + معدل حذف + نشاط غير طبيعي)
};

export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'sold' | 'deleted';

export type AdminListing = {
  id: string;
  title: string;
  description: string;
  price: number;
  categoryId: string;
  location: string;
  sellerId: string;
  sellerName: string;
  status: ListingStatus;
  createdAt: string;
  views: number;
  favorites: number;
  messagesCount: number;
  reportsCount: number;
  imagesCount: number;
  featured: boolean;
  sellerType?: 'individual' | 'business'; // فردي أو حساب تجاري/براند محلي
  brandName?: string;
  variantsCount?: number; // عدد المقاسات/الألوان لو منتج بيبيع variants
};

export type ReportType =
  | 'scam'
  | 'fake_listing'
  | 'fake_price'
  | 'prohibited_item'
  | 'inappropriate_images'
  | 'duplicate'
  | 'spam'
  | 'suspicious_account';

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export type Report = {
  id: string;
  type: ReportType;
  targetType: 'listing' | 'user' | 'chat';
  targetId: string;
  targetLabel: string;
  reporterName: string;
  createdAt: string;
  status: ReportStatus;
  notes?: string;
};

export type BoostServiceType = 'boost' | 'featured' | 'vip' | 'pinned';

export type BoostService = {
  id: string;
  type: BoostServiceType;
  name: string;
  durationLabel: string;
  priceEGP: number;
  active: boolean;
};

export type PaymentType = 'boost' | 'featured' | 'subscription' | 'topup' | 'refund';
export type PaymentStatus = 'success' | 'failed' | 'refunded' | 'pending';

export type Payment = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  method: string;
  createdAt: string;
  category?: string;
  location?: string;
};

export type PaymentMethodKind = 'vodafone_cash' | 'orange_cash' | 'etisalat_cash' | 'instapay' | 'bank_transfer';

export type PaymentNumber = {
  id: string;
  method: PaymentMethodKind;
  label: string; // اسم الوسيلة الظاهر للعميل، مثلاً "فودافون كاش"
  holderName: string; // اسم صاحب الرقم/الحساب
  number: string; // رقم الهاتف أو رقم الحساب/IBAN
  active: boolean; // لو false مش بيظهر للعميل خالص
};

export type BusinessPlan = 'basic' | 'pro' | 'business';

export type BusinessAccount = {
  id: string;
  name: string;
  ownerName: string;
  category: string;
  verified: boolean;
  plan: BusinessPlan;
  subscriptionEndsAt: string;
  listingsCount: number;
  leadsCount: number;
  status: 'active' | 'suspended';
};

// ملاحظة: أنواع التصنيفات/المواقع (Category, CategoryField, LocationNode)
// اتنقلوا لـ mock/taxonomy/types.ts — مصدر واحد لنظام التصنيفات الكامل،
// بديل التعريفات المسطّحة القديمة اللي كانت هنا.

export type ReportedChat = {
  id: string;
  buyerName: string;
  sellerName: string;
  listingTitle: string;
  reason: string;
  reportedAt: string;
  status: ReportStatus;
  flaggedKeywords: string[];
};

export type PromoCode = {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  scope: 'all' | 'boost' | 'featured' | 'subscription';
  active: boolean;
};

export type NotificationAudience = 'all' | 'city' | 'category' | 'sellers' | 'buyers';

export type NotificationCampaign = {
  id: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  audienceDetail?: string;
  status: 'draft' | 'sent' | 'scheduled';
  sentAt?: string;
  recipientsCount: number;
};

export type BannerPlacement = 'home' | 'category' | 'popup' | 'sponsored';

export type Banner = {
  id: string;
  placement: BannerPlacement;
  title: string;
  subtitle: string;
  ctaLabel: string;
  colorFrom: string;
  colorTo: string;
  active: boolean;
};

export type AppSettings = {
  appName: string;
  supportPhone: string;
  whatsapp: string;
  email: string;
  minAppVersion: string;
  maintenanceMode: boolean;
  featuredAdPriceDefault: number;
  boostPriceDefault: number;
  freeAdsLimit: number;
};
