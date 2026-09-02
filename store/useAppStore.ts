/**
 * store/useAppStore.ts
 *
 * ستيت خفيف مشترك بـ zustand — بديل prop-drilling عبر 24 شاشة. مفيش
 * باك إند دلوقتي؛ كل حاجة هنا بتتعدّل محليًا بس (favorites, إعلاناتي,
 * الرسائل, المحفظة, مسودة النشر/onboarding). مفيش بيانات بذرة وهمية —
 * كل array بيبدأ فاضي وبيتملى فعليًا من تفاعل المستخدم الحقيقي، جاهز
 * لما يتوصّل باك إند (ERP) يحل محل التخزين المحلي بنفس الشكل.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { fireLocalNotification } from '@/lib/notifications';
import type { ThumbVariant } from '@/theme/decorative';
import { conversations as seedConversations, type ChatBubble, type Conversation } from '@/mock/messages';

export type { Conversation };
import { listings as seedListings, type Listing, type ProductVariant } from '@/mock/listings';

export type { ProductVariant };
import { buildCurrentSeller, sellers as registeredSellers, type Seller } from '@/mock/users';
import type { Condition, PriceType, SellingType } from '@/mock/taxonomy';
import type { PendingSaleConfirmation, SaleMethod, SaleRecord } from '@/types/sale';
import { ensureCredentials } from '@/services/authService';
import { addFavorite as addFavoriteReal, removeFavorite as removeFavoriteReal } from '@/services/favoritesService';
import { isRealListingId } from '@/services/listingService';

// Phase 2B Slice 2: 'pending' كانت حالة وهمية أصلًا (addMyAd's تعليق —
// إعلانات المستخدم بتبدأ 'active' على طول، مفيش بوابة مراجعة حقيقية
// أبدًا استخدمت 'pending') — استُبدلت بـ'paused' الحقيقية (Souq Masr
// Listing's status الفعلي)، مش إضافة جنب حاجة موجودة.
export type AdStatus = 'active' | 'paused' | 'expired' | 'sold';

export type MyAd = {
  id: string;
  title: string;
  price: number;
  thumb: ThumbVariant;
  photoUri?: string;
  status: AdStatus;
  views: number;
  chats: number;
  favorites: number;
  expiresInDays?: number;
  isFeatured?: boolean;
};

export type OnboardingDraft = {
  phone: string; // مطبّع دوليًا فعليًا: "+20xxxxxxxxxx" — شوف lib/validation.ts's normalizePhoneForStorage
  countryIso: string; // ISO 3166-1 alpha-2 للدولة المختارة وقت تسجيل الدخول (افتراضيًا 'EG') — lib/countries.ts
  name: string;
  city: string; // اسم المحافظة (متوافق مع كل مقارنات "أقرب مدينة" الموجودة) — بيتملى بس لو المستخدم اختار موقع لاحقًا (مش جزء من onboarding إجباري)
  locationId: string | null; // المسار الكامل الحقيقي من mock/taxonomy/locations (محافظة/مدينة/منطقة) — اختياري تمامًا، مش بوابة onboarding
  interests: string[];
  joinedAt: string | null; // ISO date — بيتسجّل أول ما المستخدم يكمّل تسجيل الدخول
};

/** إجراء محتاج تسجيل دخول اتقفل لحد ما المستخدم يدخل — بيتنفّذ تلقائيًا
 * أول ما تسجيل الدخول يخلص (lib/auth.ts's resolvePendingAuthAction) بدل
 * ما يرجع الشاشة زي ما هي ويسيب المستخدم يضغط تاني. الأنواع اللي مش هنا
 * (شات/تقديم على وظيفة/نشر إعلان...) بترجع للشاشة الأصلية بس من غير
 * إعادة تنفيذ تلقائي — الفعل نفسه معقّد (فورم متعدد الخطوات) مش تبديل بسيط. */
export type PendingAuthAction =
  | { type: 'favorite_listing'; listingId: string }
  | { type: 'favorite_service'; serviceId: string }
  | { type: 'save_job'; jobId: string };

export type PostAdDraft = {
  categoryKey: string | null; // آخر تصنيف فرعي (leaf) تم اختياره
  brandId: string | null;
  modelId: string | null;
  attributes: Record<string, string>; // key من CategoryField → القيمة المُدخلة
  title: string;
  price: string;
  priceType: PriceType;
  condition: Condition | null;
  sellingType: SellingType | null;
  description: string;
  locationId: string | null; // id من mock/taxonomy/locations
  photoUris: string[]; // مسارات محلية حقيقية من معرض الصور (expo-image-picker)
  variants: ProductVariant[]; // مقاسات/ألوان — حسابات تجارية بس (PART "Business/Product Listing")
  wholesalePrice: string; // سعر الجملة — حسابات تجارية بس
  minWholesaleQty: string;
  discountPrice: string; // سعر عرض مؤقت
  discountEndsAt: string | null; // ISO
};

export type SavedSearch = {
  id: string;
  label: string; // اسم التصنيف وقت الحفظ، أو "كل الإعلانات"
  categoryId: string | null;
  query: string;
  conditionFilter: string | null;
  fieldFilters: Record<string, string>;
  createdAt: string; // ISO
};

export type NotificationType = 'ad_published' | 'ad_promoted' | 'ad_renewed' | 'payment_confirmed' | 'review_received' | 'system';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceType?: 'listing' | 'conversation';
  referenceId?: string;
  isRead: boolean;
  createdAt: string; // ISO
};

export type Review = {
  id: string;
  sellerId: string; // البائع اللي بيتقيّم
  listingId?: string; // لو التقييم على منتج معيّن مش على البائع عمومًا (حسابات تجارية)
  raterName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string; // ISO
};

export type Business = {
  id: string;
  ownerSellerId: string; // 'me' دايمًا حاليًا — الحساب التجاري امتداد للمستخدم الحالي
  name: string;
  description: string;
  phone: string;
  city: string;
  categoryIds: string[];
  openingHours: string;
  createdAt: string; // ISO
};

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  createdAt: string; // ISO
};

export type ReportReason = 'fake' | 'scam' | 'wrong_category' | 'duplicate' | 'prohibited' | 'spam' | 'abusive_seller' | 'incorrect_info';

export type Report = {
  id: string;
  listingId: string;
  reason: ReportReason;
  createdAt: string; // ISO
};

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export type VerificationState = {
  status: VerificationStatus;
  frontUri: string | null;
  backUri: string | null;
};

const emptyPostDraft: PostAdDraft = {
  categoryKey: null,
  brandId: null,
  modelId: null,
  attributes: {},
  title: '',
  price: '',
  priceType: 'negotiable',
  condition: null,
  sellingType: null,
  description: '',
  locationId: null,
  photoUris: [],
  variants: [],
  wholesalePrice: '',
  minWholesaleQty: '',
  discountPrice: '',
  discountEndsAt: null,
};

type AppState = {
  // ---- favorites ----
  // Phase 2B Slice 3: نفس الـRecord ده لسه المصدر المحلي لأي حاجة تانية
  // بتستخدم toggleFavorite/isFavorite (خدمات، إعلانات mock) — بس
  // لإعلان حقيقي (LST-#####)، toggleFavorite بقت بتنادي الباك إند
  // الحقيقي فعليًا (services/favoritesService.ts) مع optimistic update +
  // rollback عند الفشل، والـRecord ده بقى بيتحدّث (يتزرع/يتصحّح) من رد
  // كل نداء API حقيقي بيرجّع is_favorite (services/listingService.ts's
  // setFavoriteCache) — مش بيتوهم إنه "المصدر الحقيقي"، هو cache متزامن
  // مع السيرفر، مش سلطة مستقلة.
  favorites: Record<string, true>;
  toggleFavorite: (listingId: string) => void;
  isFavorite: (listingId: string) => boolean;
  setFavoriteCache: (listingId: string, isFav: boolean) => void;

  // ---- my ads ----
  myAds: MyAd[];
  addMyAd: (ad: Omit<MyAd, 'id' | 'status' | 'views' | 'chats' | 'favorites'>) => string;
  updateMyAd: (id: string, patch: Partial<Omit<MyAd, 'id'>>) => void;
  removeMyAd: (id: string) => void;
  renewMyAd: (id: string) => void;
  promoteMyAd: (id: string) => void;

  // ---- إعلانات حقيقية اتنشرت من التطبيق (تظهر في النتائج/الفلاتر مع
  // إعلانات mock/listings.ts — إثبات إن نظام التصنيفات شغّال end-to-end) ----
  userListings: Listing[];
  publishListing: (listing: Listing) => void;
  /** تعديل حقيقي (PART 43/QA): بيحدّث نفس الـid الموجود مش بينشئ نسخة
   * جديدة — قبل الإصلاح ده زرار "عدّل" كان بيفتح فورم فاضي وبينشئ إعلان
   * مكرر بدل ما يعدّل الأصلي. بيحافظ على views/postedAt/isFeatured. */
  updateListing: (id: string, patch: Partial<Omit<Listing, 'id' | 'sellerId'>>) => void;

  // ---- wallet ----
  promoBalance: number;
  adsBalance: number;
  topUp: (amount: number) => void;
  transfer: (amount: number, toPhone: string) => void;
  spendOnPromote: (amount: number) => boolean;

  // ---- messages ----
  conversations: typeof seedConversations;
  sendMessage: (conversationId: string, text: string) => void;
  /** صورة حقيقية من معرض الجهاز (expo-image-picker) — مش رسالة نصية "📎"
   * وهمية بديلة عن مرفق حقيقي. */
  sendImageMessage: (conversationId: string, imageUri: string) => void;
  startChatForListing: (listingId: string, sellerId: string) => string;
  /** رسالة "نظام" داخل محادثة — مختلفة بصريًا عن رسائل مستخدم حقيقية،
   * وأبدًا مش هتتنسب زورًا للبائع (طلب Sold Confirmation Flow §7). */
  addSystemMessage: (conversationId: string, text: string) => void;

  // ---- تدفق تأكيد البيع من الشات (Sold Confirmation Flow) — بنية جاهزة
  // لباك إند Frappe مستقبلي، مش منطق UI-only. شوف types/sale.ts. ----
  saleRecords: SaleRecord[];
  pendingSaleConfirmation: PendingSaleConfirmation | null;
  /** بتتنادى لما looksLikeSoldIntent() (lib/soldIntent.ts) يكتشف عبارة
   * بيع واضحة في رسالة البائع — مش بتغيّر حالة الإعلان لسه، بس بتفتح
   * تدفق التأكيد. مفيش تأثير لو الإعلان اتباع فعلًا أو فيه تدفق شغّال. */
  startSaleConfirmation: (conversationId: string, listingId: string) => void;
  /** البائع دوس "مباع" — يقدّم لخطوة اختيار طريقة البيع. */
  advanceToSaleMethod: () => void;
  /** البائع دوس "أخرى" — يقدّم لخطوة كتابة طريقة مخصّصة. */
  showCustomSaleMethodInput: () => void;
  /** البائع دوس "غير مباع" — يقفل التدفق من غير أي تغيير على الإعلان. */
  cancelSoldConfirmation: () => void;
  /** الفعل النهائي: بيسجّل SaleRecord، يحدّث حالة الإعلان لـ'sold'
   * (userListings + myAds لو موجود)، يبعت رسالة النظام في المحادثة،
   * ويقفل تدفق التأكيد. */
  confirmListingSold: (method: SaleMethod, customSaleMethod?: string) => void;
  isListingSold: (listingId: string) => boolean;
  getSoldListings: () => Listing[];
  getSaleDetails: (listingId: string) => SaleRecord | undefined;

  // ---- onboarding / post draft (transient UI state) ----
  onboarding: OnboardingDraft;
  setOnboarding: (patch: Partial<OnboardingDraft>) => void;
  resetOnboarding: () => void;

  // ---- بوابة تسجيل الدخول المركزية (Guest vs Authenticated access control) ----
  pendingAuthAction: PendingAuthAction | null;
  setPendingAuthAction: (a: PendingAuthAction | null) => void;

  postDraft: PostAdDraft;
  setPostDraft: (patch: Partial<PostAdDraft>) => void;
  resetPostDraft: () => void;

  // ---- عمليات بحث محفوظة ----
  savedSearches: SavedSearch[];
  addSavedSearch: (s: Omit<SavedSearch, 'id' | 'createdAt'>) => void;
  removeSavedSearch: (id: string) => void;

  // ---- إشعارات حقيقية (بتتولّد من أحداث فعلية في التطبيق — نشر/تمييز/
  // تجديد إعلان، تأكيد دفع، تقييم جديد — مفيش إشعار وهمي) ----
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;

  // ---- تقييمات بائعين حقيقية ----
  reviews: Review[];
  addReview: (r: Omit<Review, 'id' | 'createdAt'>) => void;

  // ---- الحساب التجاري (Business Profile) ----
  business: Business | null;
  setBusiness: (b: Omit<Business, 'id' | 'ownerSellerId' | 'createdAt'>) => void;
  clearBusiness: () => void;

  // ---- بائعين محظورين (حظر حقيقي، مش زرار ميت في الإعدادات) ----
  blockedSellerIds: string[];
  blockSeller: (sellerId: string) => void;
  unblockSeller: (sellerId: string) => void;
  isSellerBlocked: (sellerId: string) => boolean;

  // ---- تذاكر دعم فني (المساعدة والدعم) ----
  supportTickets: SupportTicket[];
  addSupportTicket: (t: { subject: string; message: string }) => void;

  // ---- بلاغات إعلانات (PART 28) ----
  reports: Report[];
  reportListing: (listingId: string, reason: ReportReason) => void;
  hasReported: (listingId: string) => boolean;

  // ---- توثيق الهوية (صور حقيقية من المعرض، مش حالة "قيد المراجعة" وهمية) ----
  verification: VerificationState;
  setVerificationPhoto: (side: 'front' | 'back', uri: string) => void;

  // ---- عداد مشاهدات حقيقي: بيزيد فعليًا كل ما حد يفتح صفحة تفاصيل
  // الإعلان (بيغذّي شاشة تحليلات البائع) ----
  incrementListingViews: (listingId: string) => void;

  // ---- settings (غير الثيم، ده متابع في ThemeProvider) ----
  notificationsEnabled: boolean;
  faceIdEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  setFaceIdEnabled: (v: boolean) => void;
};

let adCounter = 1;

/** PART QA-fix (Phase 5 — الأهم في كل المراجعة): كان مفيش persist خالص —
 * كل بيانات المستخدم (إعلانات/مفضلة/محفظة/رسائل/onboarding...) كانت
 * بتتمسح تمامًا لو التطبيق اتقفل أو عمل reload. دلوقتي بتتخزن فعليًا في
 * AsyncStorage وبترجع لما التطبيق يفتح تاني. */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  favorites: {},
  toggleFavorite: (id) => {
    if (isRealListingId(id)) {
      const wasFav = !!get().favorites[id];
      const nextFav = !wasFav;
      // optimistic — القلب بيتلوّن فورًا، مش لما الشبكة ترجع.
      get().setFavoriteCache(id, nextFav);
      const onboarding = get().onboarding;
      ensureCredentials(onboarding.name, onboarding.phone, onboarding.countryIso).then((credsResult) => {
        if (credsResult.status !== 'success') {
          get().setFavoriteCache(id, wasFav); // rollback — مفيش نجاح وهمي
          return;
        }
        const action = nextFav ? addFavoriteReal(id) : removeFavoriteReal(id);
        action.then((r) => {
          if (r.status !== 'success') get().setFavoriteCache(id, wasFav); // rollback
        });
      });
      return;
    }
    set((s) => {
      const next = { ...s.favorites };
      if (next[id]) delete next[id];
      else next[id] = true;
      return { favorites: next };
    });
  },
  isFavorite: (id) => !!get().favorites[id],
  setFavoriteCache: (id, isFav) =>
    set((s) => {
      const next = { ...s.favorites };
      if (isFav) next[id] = true;
      else delete next[id];
      return { favorites: next };
    }),

  myAds: [],
  addMyAd: (ad) => {
    const id = `my-new-${adCounter++}`;
    // PART QA-fix (Phase 4/12): كان بيبدأ 'pending' زي إن فيه مراجعة
    // إدارية حقيقية — بس مفيش باك إند مراجعة موصول فعليًا (لوحة الأدمن
    // ستور منفصل تمامًا)، والإعلان أصلًا ظاهر وقابل للبحث فورًا في
    // userListings من غير أي بوابة. يعني "قيد المراجعة" كانت حالة وهمية
    // بتفضل معلّقة للأبد وتوهم البائع إن إعلانه مش شغّال. دلوقتي بيبدأ
    // 'active' عشان يطابق الواقع الفعلي — نفس لحظة النشر.
    set((s) => ({
      myAds: [{ id, status: 'active', expiresInDays: 30, views: 0, chats: 0, favorites: 0, ...ad }, ...s.myAds],
    }));
    return id;
  },
  updateMyAd: (id, patch) => set((s) => ({ myAds: s.myAds.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  // PART QA-fix (Phase 4/12): كان بيشيل من myAds بس — الإعلان الحقيقي في
  // userListings كان فاضل زي ما هو وظاهر في النتائج/التصنيفات، يعني
  // "حذف" كانت بتوهم بس مش بتحذف فعليًا. دلوقتي بيشيل الاتنين مع بعض.
  removeMyAd: (id) => set((s) => ({ myAds: s.myAds.filter((a) => a.id !== id), userListings: s.userListings.filter((l) => l.id !== id) })),

  userListings: [],
  publishListing: (listing) => {
    set((s) => ({ userListings: [listing, ...s.userListings] }));
    get().addNotification({
      type: 'ad_published',
      title: 'إعلانك اتنشر',
      body: `"${listing.title}" بقى ظاهر دلوقتي على سوق مصر.`,
      referenceType: 'listing',
      referenceId: listing.id,
    });
  },
  updateListing: (id, patch) =>
    set((s) => ({ userListings: s.userListings.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

  renewMyAd: (id) => {
    set((s) => ({
      myAds: s.myAds.map((a) => (a.id === id ? { ...a, status: 'active', expiresInDays: 30 } : a)),
    }));
    const ad = get().myAds.find((a) => a.id === id);
    if (ad) get().addNotification({ type: 'ad_renewed', title: 'اتجدّد الإعلان', body: `"${ad.title}" هيفضل ظاهر 30 يوم كمان.` });
  },
  promoteMyAd: (id) => {
    set((s) => ({ myAds: s.myAds.map((a) => (a.id === id ? { ...a, isFeatured: true } : a)) }));
    const ad = get().myAds.find((a) => a.id === id);
    if (ad) get().addNotification({ type: 'ad_promoted', title: 'إعلانك بقى مميز', body: `"${ad.title}" هيظهر الأول في نتائج البحث دلوقتي.` });
  },

  promoBalance: 0,
  adsBalance: 0,
  topUp: (amount) => {
    set((s) => ({ adsBalance: s.adsBalance + amount }));
    get().addNotification({ type: 'payment_confirmed', title: 'اتأكد الشحن', body: `${amount.toLocaleString('en-US')} ج.م اتضافوا لرصيد إعلاناتك.` });
  },
  transfer: (amount, toPhone) => {
    set((s) => ({ adsBalance: Math.max(0, s.adsBalance - amount) }));
    get().addNotification({ type: 'payment_confirmed', title: 'اتحوّل الرصيد', body: `${amount.toLocaleString('en-US')} ج.م اتحوّلوا لـ ${toPhone}.` });
  },
  spendOnPromote: (amount) => {
    const s = get();
    if (s.promoBalance < amount) return false;
    set({ promoBalance: s.promoBalance - amount });
    return true;
  },

  conversations: seedConversations,
  sendMessage: (conversationId, text) =>
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const bubble: ChatBubble = {
          id: `b-${Date.now()}`,
          from: 'me',
          text,
          time: new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
          read: false,
        };
        return { ...c, bubbles: [...c.bubbles, bubble], lastMessage: text, lastMessageFromMe: true, time: 'الآن' };
      }),
    })),
  sendImageMessage: (conversationId, imageUri) =>
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const bubble: ChatBubble = {
          id: `b-${Date.now()}`,
          from: 'me',
          text: '',
          imageUri,
          time: new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
          read: false,
        };
        return { ...c, bubbles: [...c.bubbles, bubble], lastMessage: 'صورة 📷', lastMessageFromMe: true, time: 'الآن' };
      }),
    })),
  startChatForListing: (listingId, sellerId) => {
    const existing = get().conversations.find((c) => c.listingId === listingId);
    if (existing) return existing.id;
    const id = `c-${listingId}`;
    set((s) => ({
      conversations: [
        { id, sellerId, lastMessage: '', time: 'الآن', unread: 0, listingId, bubbles: [] },
        ...s.conversations,
      ],
    }));
    return id;
  },
  addSystemMessage: (conversationId, text) =>
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const bubble: ChatBubble = {
          id: `sys-${Date.now()}`,
          from: 'me', // مش حقيقي، مستخدم بس عشان الـtype — العرض بيتفرّع على kind لا from
          text,
          time: new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
          kind: 'system',
        };
        return { ...c, bubbles: [...c.bubbles, bubble], lastMessage: text, lastMessageFromMe: false, time: 'الآن' };
      }),
    })),

  // ---- تدفق تأكيد البيع من الشات ----
  saleRecords: [],
  pendingSaleConfirmation: null,
  isListingSold: (listingId) => get().saleRecords.some((r) => r.listingId === listingId),
  startSaleConfirmation: (conversationId, listingId) => {
    const s = get();
    if (s.isListingSold(listingId)) return; // القسم 9 — إعلان مباع فعلًا متفتحش له تدفق تاني
    if (s.pendingSaleConfirmation) return; // تدفق شغّال أصلًا — منمنعش يتكرر فوق بعضه
    set({ pendingSaleConfirmation: { conversationId, listingId, stage: 'ask_sold' } });
  },
  advanceToSaleMethod: () =>
    set((s) => (s.pendingSaleConfirmation ? { pendingSaleConfirmation: { ...s.pendingSaleConfirmation, stage: 'ask_method' } } : {})),
  showCustomSaleMethodInput: () =>
    set((s) => (s.pendingSaleConfirmation ? { pendingSaleConfirmation: { ...s.pendingSaleConfirmation, stage: 'ask_custom_method' } } : {})),
  cancelSoldConfirmation: () => set({ pendingSaleConfirmation: null }),
  confirmListingSold: (method, customSaleMethod) => {
    const s = get();
    const pending = s.pendingSaleConfirmation;
    if (!pending) return;
    if (s.isListingSold(pending.listingId)) {
      // القسم 9 — حماية مضاعفة: حتى لو حصل race وconfirmListingSold اتنادت
      // مرتين لنفس الإعلان، السجل التاني ميتضافش.
      set({ pendingSaleConfirmation: null });
      return;
    }

    const listing = [...s.userListings, ...seedListings].find((l) => l.id === pending.listingId);
    const nowIso = new Date().toISOString();
    const record: SaleRecord = {
      id: `sale-${Date.now()}`,
      listingId: pending.listingId,
      sellerId: listing?.sellerId ?? 'me',
      buyerId: undefined, // مفيش هوية مشتري حقيقية متاحة من غير باك إند متعدد المستخدمين — شوف ACCESS_CONTROL.md's §5
      saleStatus: 'sold',
      soldAt: nowIso,
      saleMethod: method,
      customSaleMethod: method === 'other' ? customSaleMethod?.trim() || undefined : undefined,
      conversationId: pending.conversationId,
      confirmationSource: 'chat',
      timestamp: nowIso,
    };

    set((st) => ({
      saleRecords: [record, ...st.saleRecords],
      userListings: st.userListings.map((l) => (l.id === pending.listingId ? { ...l, saleStatus: 'sold' } : l)),
      myAds: st.myAds.map((a) => (a.id === pending.listingId ? { ...a, status: 'sold' } : a)),
      pendingSaleConfirmation: null,
    }));

    get().addSystemMessage(pending.conversationId, 'تم تسجيل الإعلان كمباع وإخفاؤه من نتائج البحث.');
    get().addNotification({
      type: 'system',
      title: 'اتسجّل البيع',
      body: listing ? `"${listing.title}" اتسجّل كمباع وهيفضل في سجل مبيعاتك.` : 'الإعلان اتسجّل كمباع.',
      referenceType: 'listing',
      referenceId: pending.listingId,
    });
  },
  getSoldListings: () => {
    const s = get();
    return [...s.userListings, ...seedListings].filter((l) => l.saleStatus === 'sold');
  },
  getSaleDetails: (listingId) => get().saleRecords.find((r) => r.listingId === listingId),

  onboarding: { phone: '', countryIso: 'EG', name: '', city: '', locationId: null, interests: [], joinedAt: null },
  setOnboarding: (patch) => set((s) => ({ onboarding: { ...s.onboarding, ...patch } })),
  resetOnboarding: () => set({ onboarding: { phone: '', countryIso: 'EG', name: '', city: '', locationId: null, interests: [], joinedAt: null } }),

  pendingAuthAction: null,
  setPendingAuthAction: (a) => set({ pendingAuthAction: a }),

  postDraft: emptyPostDraft,
  setPostDraft: (patch) => set((s) => ({ postDraft: { ...s.postDraft, ...patch } })),
  resetPostDraft: () => set({ postDraft: emptyPostDraft }),

  savedSearches: [],
  addSavedSearch: (s) =>
    set((st) => ({
      savedSearches: [{ id: `ss-${Date.now()}`, createdAt: new Date().toISOString(), ...s }, ...st.savedSearches],
    })),
  removeSavedSearch: (id) => set((st) => ({ savedSearches: st.savedSearches.filter((s) => s.id !== id) })),

  notifications: [],
  addNotification: (n) => {
    set((s) => ({
      notifications: [{ id: `n-${Date.now()}-${s.notifications.length}`, isRead: false, createdAt: new Date().toISOString(), ...n }, ...s.notifications],
    }));
    // إشعار حقيقي في مركز إشعارات الجهاز — بس لو المستخدم مفعّل التنبيهات
    // من الإعدادات (نفس الـtoggle الحقيقي في settings.tsx).
    if (get().notificationsEnabled) fireLocalNotification(n.title, n.body);
  },
  markNotificationRead: (id) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) })),
  markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, isRead: true })) })),
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  reviews: [],
  addReview: (r) => {
    set((s) => ({ reviews: [{ id: `rv-${Date.now()}`, createdAt: new Date().toISOString(), ...r }, ...s.reviews] }));
    get().addNotification({ type: 'review_received', title: 'تقييم جديد', body: `${r.raterName} قيّمك ${r.rating} نجوم.` });
  },

  business: null,
  setBusiness: (b) =>
    set((s) => ({
      business: { id: s.business?.id ?? `biz-${Date.now()}`, ownerSellerId: 'me', createdAt: s.business?.createdAt ?? new Date().toISOString(), ...b },
    })),
  clearBusiness: () => set({ business: null }),

  blockedSellerIds: [],
  blockSeller: (sellerId) => set((s) => ({ blockedSellerIds: s.blockedSellerIds.includes(sellerId) ? s.blockedSellerIds : [...s.blockedSellerIds, sellerId] })),
  unblockSeller: (sellerId) => set((s) => ({ blockedSellerIds: s.blockedSellerIds.filter((id) => id !== sellerId) })),
  isSellerBlocked: (sellerId) => get().blockedSellerIds.includes(sellerId),

  supportTickets: [],
  addSupportTicket: (t) =>
    set((s) => ({
      supportTickets: [{ id: `tk-${Date.now()}`, status: 'open', createdAt: new Date().toISOString(), ...t }, ...s.supportTickets],
    })),

  reports: [],
  reportListing: (listingId, reason) =>
    set((s) => ({ reports: [{ id: `rp-${Date.now()}`, listingId, reason, createdAt: new Date().toISOString() }, ...s.reports] })),
  hasReported: (listingId) => get().reports.some((r) => r.listingId === listingId),

  verification: { status: 'unverified', frontUri: null, backUri: null },
  setVerificationPhoto: (side, uri) =>
    set((s) => {
      const next = { ...s.verification, [side === 'front' ? 'frontUri' : 'backUri']: uri };
      return { verification: { ...next, status: next.frontUri && next.backUri ? 'pending' : 'unverified' } };
    }),

  incrementListingViews: (listingId) =>
    set((s) => ({
      userListings: s.userListings.map((l) => (l.id === listingId ? { ...l, views: l.views + 1 } : l)),
      myAds: s.myAds.map((a) => (a.id === listingId ? { ...a, views: a.views + 1 } : a)),
    })),

  notificationsEnabled: true,
  faceIdEnabled: false,
  setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
  setFaceIdEnabled: (v) => set({ faceIdEnabled: v }),
    }),
    {
      // اسم الـkey ده intentionally من غير تغيير بعد إعادة تسمية العلامة
      // التجارية لـ"سوق مصر" — مفتاح AsyncStorage تخزين محلي غير مرئي
      // للمستخدم خالص (مش زي أي نص واجهة)، وأي جهاز حقيقي عليه بيانات
      // محفوظة فعليًا بالمفتاح القديم هيفقدها لو اتغيّر. مفيش قيمة تسويقية
      // في تغييره وفيه خطر حقيقي (لو بسيط) — قرار متعمّد، مش نسيان.
      name: 'mazad-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

/** كل الإعلانات — mock/listings.ts الثابتة + أي إعلان حقيقي اتنشر من
 * التطبيق (userListings). ده اللي شاشات النتائج/التصنيفات/التفاصيل
 * لازم تستخدمه بدل `listings` الثابتة على طول، عشان الإعلان الجديد يظهر
 * فعليًا تحت تصنيفه الصح فورًا بعد النشر (PART 40 verification). */
export function useAllListings(): Listing[] {
  const userListings = useAppStore((s) => s.userListings);
  return [...userListings, ...seedListings];
}

export function useListingById(id: string | undefined): Listing | undefined {
  const all = useAllListings();
  return id ? all.find((l) => l.id === id) : undefined;
}

/** زي useAllListings بس من غير الإعلانات المباعة — ده اللي كل مسارات
 * الاكتشاف العامة (الرئيسية/نتائج البحث/التصنيفات/إعلانات البائع
 * العامة) لازم تستخدمه بدل useAllListings، عشان إعلان اتباع من الشات
 * (Sold Confirmation Flow) يختفي فورًا من التصفح العادي من غير ما
 * يتحذف من الداتا نفسها (لسه موجود لسجل مبيعات البائع/الأدمن). */
export function useDiscoverableListings(): Listing[] {
  const all = useAllListings();
  return all.filter((l) => l.saleStatus !== 'sold');
}

export function useSoldListings(): Listing[] {
  const all = useAllListings();
  return all.filter((l) => l.saleStatus === 'sold');
}

export function useSaleDetails(listingId: string | undefined) {
  const saleRecords = useAppStore((s) => s.saleRecords);
  return listingId ? saleRecords.find((r) => r.listingId === listingId) : undefined;
}

/** بيرجع بيانات بائع حقيقية: لو id === 'me' بيبنيها من onboarding
 * (اللي المستخدم كتبه فعليًا وقت تسجيل الدخول)، غير كده بيدوّر في سجل
 * البائعين الحقيقيين (فاضي دلوقتي، هيتملى من API المستخدمين بعد ما
 * يتوصّل باك إند). مفيش بيانات وهمية في أي مسار. */
export function useSeller(id: string | undefined): Seller | undefined {
  const onboarding = useAppStore((s) => s.onboarding);
  const adsCount = useAppStore((s) => s.myAds.length);
  const reviews = useAppStore((s) => s.reviews);
  if (!id) return undefined;
  const sellerReviews = reviews.filter((r) => r.sellerId === id);
  const rating = sellerReviews.length > 0 ? sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length : 0;
  if (id === 'me') {
    return buildCurrentSeller({
      name: onboarding.name,
      phone: onboarding.phone,
      adsCount,
      joinedLabel: formatJoinedLabel(onboarding.joinedAt),
      rating: Math.round(rating * 10) / 10,
    });
  }
  const base = registeredSellers[id];
  if (!base) return undefined;
  return sellerReviews.length > 0 ? { ...base, rating: Math.round(rating * 10) / 10 } : base;
}

/** كل تقييمات بائع معيّن، الأحدث أول. */
export function useSellerReviews(sellerId: string | undefined): Review[] {
  const reviews = useAppStore((s) => s.reviews);
  if (!sellerId) return [];
  return reviews.filter((r) => r.sellerId === sellerId);
}

/** المصدر الوحيد لسؤال "المستخدم داخل حسابه ولا لسه ضيف؟" في التطبيق
 * كله — نفس onboarding.joinedAt اللي بيتسجّل فعليًا في نهاية signin.tsx،
 * مش حقل موازي جديد. أي شاشة/hook محتاج يعرف حالة الدخول لازم يستخدم ده
 * بدل ما يفحص onboarding.name أو .phone بنفسه. */
export function useIsAuthenticated(): boolean {
  return useAppStore((s) => !!s.onboarding.joinedAt);
}

function formatJoinedLabel(joinedAt: string | null): string {
  if (!joinedAt) return 'عضو جديد';
  const d = new Date(joinedAt);
  if (Number.isNaN(d.getTime())) return 'عضو جديد';
  return `عضو من ${new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(d)}`;
}

export default useAppStore;
