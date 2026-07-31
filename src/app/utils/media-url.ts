import { environment } from '../../environments/environment';

/**
 * Canonical public image URL resolver.
 * Prefer persisted Admin/API fields in this order when callers pick a source:
 *   image_url → secure_url → url → (entity-specific: photo_url, featured_image_url, avatar_url)
 * Never invents /media or assets paths. Strips known placeholder CDN hosts.
 */
export function resolveMediaUrl(
  imageUrl?: string | null,
  fallback = '',
  apiBaseUrl: string = environment.apiUrl
): string {
  if (!imageUrl) return fallback;
  const v = String(imageUrl).trim();
  if (!v) return fallback;
  if (/unsplash\.com|images\.pexels\.com|placehold/i.test(v)) return fallback;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('/api/')) {
    const base = apiBaseUrl.replace(/\/api\/?$/, '');
    return `${base}${v}`;
  }
  return v;
}

/** Prefer upload/API response aliases in one order everywhere. */
export function pickUploadedImageUrl(result: {
  image_url?: string;
  secure_url?: string;
  url?: string;
  avatar_url?: string;
} | null | undefined): string {
  if (!result) return '';
  return (
    result.image_url ||
    result.secure_url ||
    result.url ||
    result.avatar_url ||
    ''
  ).trim();
}

/**
 * Primary course image — always image_url first so list/detail/pricing stay aligned.
 * Do not prefer thumbnail_url / banner_image_url over image_url.
 */
export function primaryCourseImageUrl(course: {
  image_url?: string | null;
  secure_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
  banner_image_url?: string | null;
  mobile_image_url?: string | null;
} | null | undefined): string {
  if (!course) return '';
  return (
    course.image_url ||
    course.secure_url ||
    course.image ||
    course.thumbnail_url ||
    course.banner_image_url ||
    course.mobile_image_url ||
    ''
  );
}

export function displayCoursePrice(course: {
  price_label?: string | null;
  amount_inr?: number | null;
} | null | undefined): string {
  if (!course) return '';
  if (course.price_label?.trim()) return course.price_label.trim();
  if (course.amount_inr != null && Number(course.amount_inr) > 0) {
    return `₹${course.amount_inr}`;
  }
  return '';
}
