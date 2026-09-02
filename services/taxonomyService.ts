/**
 * services/taxonomyService.ts — Phase 2A: طبقة الخدمة الحقيقية لكل الـ10
 * taxonomy endpoints (شوف BACKEND_PRODUCTION_READINESS.md — الكل مُتحقّق
 * منه حي على الباك إند الفعلي). كل دالة هنا بترجع ApiResult<T> (نجاح/مفيش
 * إنترنت/الباك إند واقع/...) — مفيش throw، ومفيش بيانات وهمية لو الطلب
 * فشل (القسم 10 من طلب Phase 2: "لا تعمل fake API").
 *
 * كل دالة بترجّع نفس شكل TypeScript اللي التطبيق مستخدمه فعليًا من
 * mock/taxonomy/types.ts (Category/Brand/Model/LocationNode) — مش شكل رد
 * Frappe الخام (name_ar/name_en/location_type...) — عشان الشاشات
 * الموجودة تقدر تستهلك البيانات الحقيقية من غير أي تعديل في الـUI نفسه.
 * التحويل (adapter) بيحصل هنا في مكان واحد بس.
 */
import { frappeGet } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';
import type {
  Brand,
  Category,
  CategoryField,
  Condition,
  FieldType,
  LocationNode,
  LocationType,
  Model,
  SellingType,
} from '@/mock/taxonomy/types';
import type { IconName } from '@/components/Icon';

const NS = 'souq_masr.api.v1.taxonomy';

// ============================================================ أشكال رد Frappe الخام

type RawCategorySummary = {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  sort_order: number;
  is_group: number | boolean;
  has_brands: number | boolean;
};

type RawCategoryField = {
  key: string;
  label: string;
  type: string; // "Text" | "Number" | "Select" | ... (Capitalized — Frappe field_type)
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  options: string[] | null;
  unit: string | null;
};

type RawCategoryDetail = {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  icon: string;
  has_brands: boolean;
  allowed_conditions: string[] | null;
  allowed_selling_types: string[] | null;
  fields: RawCategoryField[];
};

type RawPathEntry = { id: string; name: string };

type RawBrand = { id: string; name: string; logo: string | null };
type RawModel = { id: string; name: string };
type RawLocation = { id: string; name: string };
type RawLocationChild = { id: string; name: string; location_type: string };
type RawLocationSearchResult = { id: string; name: string; location_type: string; parent_id: string | null };

// ============================================================ محوّلات (Frappe raw → app-native types)

/** Frappe field_type (Capitalized) → mock/taxonomy/types.ts's FieldType (lowercase). */
const FIELD_TYPE_MAP: Record<string, FieldType> = {
  Text: 'text',
  Number: 'number',
  Select: 'select',
  Multiselect: 'multiselect',
  Boolean: 'boolean',
  Date: 'date',
  Year: 'year',
  Location: 'location',
};

function adaptField(f: RawCategoryField): CategoryField {
  return {
    key: f.key,
    label: f.label,
    type: FIELD_TYPE_MAP[f.type] ?? 'text',
    required: f.required,
    filterable: f.filterable,
    searchable: f.searchable,
    options: f.options ?? undefined,
    unit: f.unit ?? undefined,
  };
}

function adaptCategorySummary(c: RawCategorySummary, parentId: string | null): Category {
  return {
    id: c.id,
    parentId,
    name: c.name_ar,
    nameEn: c.name_en,
    icon: c.icon as IconName,
    order: c.sort_order,
    hasBrands: !!c.has_brands,
    fields: [],
  };
}

function adaptCategoryDetail(c: RawCategoryDetail): Category {
  return {
    id: c.id,
    parentId: c.parent_id,
    name: c.name_ar,
    nameEn: c.name_en,
    icon: c.icon as IconName,
    order: 0, // get_category الخام مبيرجّعش sort_order — مش محتاج لشاشة تفاصيل تصنيف واحد
    hasBrands: c.has_brands,
    fields: (c.fields ?? []).map(adaptField),
    allowedConditions: (c.allowed_conditions ?? undefined) as Condition[] | undefined,
    allowedSellingTypes: (c.allowed_selling_types ?? undefined) as SellingType[] | undefined,
  };
}

function adaptBrand(b: RawBrand): Brand {
  return { id: b.id, name: b.name, categoryIds: [] };
}

function adaptModel(m: RawModel, brandId: string): Model {
  return { id: m.id, brandId, name: m.name };
}

const LOCATION_TYPE_MAP: Record<string, LocationType> = {
  Governorate: 'governorate',
  City: 'city',
  District: 'district',
  Area: 'area',
};

function adaptLocationChild(l: RawLocationChild, parentId: string): LocationNode {
  return { id: l.id, name: l.name, type: LOCATION_TYPE_MAP[l.location_type] ?? 'area', parentId };
}

function adaptGovernorate(l: RawLocation): LocationNode {
  return { id: l.id, name: l.name, type: 'governorate', parentId: null };
}

function adaptLocationSearchResult(l: RawLocationSearchResult): LocationNode {
  return { id: l.id, name: l.name, type: LOCATION_TYPE_MAP[l.location_type] ?? 'area', parentId: l.parent_id };
}

// ============================================================ دوال الخدمة العامة (10 endpoints)

/** التصنيفات الرئيسية (parent فاضي) أو أبناء تصنيف معيّن — mirrors mock's getChildren()/getTopLevel(). */
export async function getChildren(parent?: string): Promise<ApiResult<Category[]>> {
  const r = await frappeGet<RawCategorySummary[]>(`${NS}.get_children`, parent ? { parent } : undefined);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.map((c) => adaptCategorySummary(c, parent ?? null)) };
}

/** تفاصيل تصنيف كاملة (بما فيها الحقول الديناميكية) — mirrors getCategory(). */
export async function getCategory(categoryKey: string): Promise<ApiResult<Category>> {
  const r = await frappeGet<RawCategoryDetail>(`${NS}.get_category`, { category_key: categoryKey });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptCategoryDetail(r.data) };
}

/** المسار من الجذر للتصنيف ده — mirrors getPath(). */
export async function getPath(categoryKey: string): Promise<ApiResult<{ id: string; name: string }[]>> {
  const r = await frappeGet<RawPathEntry[]>(`${NS}.get_path`, { category_key: categoryKey });
  return r;
}

/** التصنيف نفسه + كل أحفاده — mirrors getAllDescendantIds(). */
export async function getDescendantIds(categoryKey: string): Promise<ApiResult<string[]>> {
  return frappeGet<string[]>(`${NS}.get_descendant_ids`, { category_key: categoryKey });
}

/** بحث في أسماء التصنيفات (عربي/إنجليزي). */
export async function searchCategories(q: string, limit = 30): Promise<ApiResult<Category[]>> {
  const r = await frappeGet<RawCategorySummary[]>(`${NS}.search_categories`, { q, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.map((c) => adaptCategorySummary(c, null)) };
}

/** البراندات المرتبطة بتصنيف معيّن — mirrors getBrandsForCategory(). */
export async function getBrandsForCategory(categoryKey: string): Promise<ApiResult<Brand[]>> {
  const r = await frappeGet<RawBrand[]>(`${NS}.get_brands_for_category`, { category_key: categoryKey });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.map(adaptBrand) };
}

/** موديلات براند معيّن — mirrors getModelsForBrand(). */
export async function getModelsForBrand(brandKey: string): Promise<ApiResult<Model[]>> {
  const r = await frappeGet<RawModel[]>(`${NS}.get_models_for_brand`, { brand_key: brandKey });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.map((m) => adaptModel(m, brandKey)) };
}

/** الـ27 محافظة — mirrors getGovernorates(). */
export async function getGovernorates(): Promise<ApiResult<LocationNode[]>> {
  const r = await frappeGet<RawLocation[]>(`${NS}.get_governorates`);
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.map(adaptGovernorate) };
}

/** أبناء موقع معيّن (مدن محافظة، أو مناطق مدينة) — mirrors getLocationChildren(). */
export async function getLocationChildren(parent: string): Promise<ApiResult<LocationNode[]>> {
  const r = await frappeGet<RawLocationChild[]>(`${NS}.get_location_children`, { parent });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.map((l) => adaptLocationChild(l, parent)) };
}

/** بحث في كل مستويات الموقع مع بعض (محافظة/مدينة/منطقة) — mirrors searchLocations(). */
export async function searchLocations(q: string, limit = 30): Promise<ApiResult<LocationNode[]>> {
  const r = await frappeGet<RawLocationSearchResult[]>(`${NS}.search_locations`, { q, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: r.data.map(adaptLocationSearchResult) };
}
