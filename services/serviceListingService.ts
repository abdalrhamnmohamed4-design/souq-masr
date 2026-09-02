/**
 * services/serviceListingService.ts — Services vertical:
 * souq_masr.api.v1.services (خدمة تقدّمها محترف — مش listing عام). اسم
 * الملف مختلف عمدًا عن services/listingService.ts (نطاق مختلف تمامًا)
 * وعن مجلد services/ نفسه (تعارض تسمية بديهي مع "الخدمات" كمفهوم منتج).
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.services';

export type ServicePriceType = 'fixed' | 'starting_from' | 'hourly' | 'negotiable';
export type ServiceStatus = 'active' | 'paused' | 'deleted';

export type RealServiceListing = {
  id: string;
  owner: string;
  categoryKey: string;
  tradeKey: string | null;
  title: string;
  description: string;
  price: number | null;
  priceType: ServicePriceType;
  serviceAreas: string[];
  duration: string;
  imageUrls: string[];
  availability: string;
  status: ServiceStatus;
  offerPrice: number | null;
  offerEndsAt: string | null;
  postedAt: string;
  isOwner: boolean;
};

export type RealServiceSummary = Omit<RealServiceListing, 'description' | 'duration' | 'availability' | 'isOwner'>;

function adaptFull(raw: any): RealServiceListing {
  return {
    id: raw.id, owner: raw.owner, categoryKey: raw.category_key, tradeKey: raw.trade_key, title: raw.title,
    description: raw.description, price: raw.price, priceType: raw.price_type, serviceAreas: raw.service_areas,
    duration: raw.duration, imageUrls: raw.image_urls, availability: raw.availability, status: raw.status,
    offerPrice: raw.offer_price, offerEndsAt: raw.offer_ends_at, postedAt: raw.posted_at, isOwner: raw.is_owner,
  };
}

function adaptSummary(raw: any): RealServiceSummary {
  return {
    id: raw.id, owner: raw.owner, categoryKey: raw.category_key, tradeKey: raw.trade_key, title: raw.title,
    price: raw.price, priceType: raw.price_type, serviceAreas: raw.service_areas, imageUrls: raw.image_urls,
    status: raw.status, offerPrice: raw.offer_price, offerEndsAt: raw.offer_ends_at, postedAt: raw.posted_at,
  };
}

/** خدمة حقيقية دايمًا SRV-##### (autoname). */
export function isRealServiceId(id: string | undefined | null): boolean {
  return !!id && /^SRV-\d+$/.test(id);
}

export type ServiceInput = {
  categoryKey: string;
  title: string;
  tradeKey?: string;
  description?: string;
  price?: number;
  priceType?: ServicePriceType;
  serviceAreas?: string[];
  duration?: string;
  imageUrls?: string[];
  availability?: string;
  offerPrice?: number;
  offerEndsAt?: string;
};

function toWirePayload(input: Partial<ServiceInput>) {
  return {
    category_key: input.categoryKey, title: input.title, trade_key: input.tradeKey, description: input.description,
    price: input.price, price_type: input.priceType,
    service_areas: input.serviceAreas ? JSON.stringify(input.serviceAreas) : undefined,
    duration: input.duration,
    image_urls: input.imageUrls ? JSON.stringify(input.imageUrls) : undefined,
    availability: input.availability, offer_price: input.offerPrice, offer_ends_at: input.offerEndsAt,
  };
}

export async function createService(input: ServiceInput): Promise<ApiResult<RealServiceListing>> {
  const r = await frappePost<any>(`${NS}.create_service`, toWirePayload(input));
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function updateService(serviceId: string, patch: Partial<ServiceInput>): Promise<ApiResult<RealServiceListing>> {
  const r = await frappePost<any>(`${NS}.update_service`, { service_id: serviceId, ...toWirePayload(patch) });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function pauseService(serviceId: string): Promise<ApiResult<RealServiceListing>> {
  const r = await frappePost<any>(`${NS}.pause_service`, { service_id: serviceId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function activateService(serviceId: string): Promise<ApiResult<RealServiceListing>> {
  const r = await frappePost<any>(`${NS}.activate_service`, { service_id: serviceId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function deleteService(serviceId: string): Promise<ApiResult<{ deleted: boolean }>> {
  return frappePost(`${NS}.delete_service`, { service_id: serviceId });
}

export async function getServiceListing(serviceId: string): Promise<ApiResult<RealServiceListing>> {
  const r = await frappeGet<any>(`${NS}.get_service`, { service_id: serviceId });
  if (r.status !== 'success') return r;
  return { status: 'success', data: adaptFull(r.data) };
}

export async function getMyServices(status?: ServiceStatus, page = 1, limit = 20): Promise<ApiResult<{ items: RealServiceSummary[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.get_my_services`, { status, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total } };
}

export async function searchServices(q?: string, categoryKey?: string, priceType?: ServicePriceType, page = 1, limit = 20): Promise<ApiResult<{ items: RealServiceSummary[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.search_services`, { q, category_key: categoryKey, price_type: priceType, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total } };
}

export async function getServicesByProfessional(owner: string, page = 1, limit = 20): Promise<ApiResult<{ items: RealServiceSummary[]; total: number }>> {
  const r = await frappeGet<{ items: any[]; total: number }>(`${NS}.get_services_by_professional`, { owner, page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adaptSummary), total: r.data.total } };
}
