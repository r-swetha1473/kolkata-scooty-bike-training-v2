import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SettingsService, SiteSettings } from './settings.service';
import { Course, CourseService } from './course.service';
import { TestimonialService } from './testimonial.service';
import {
  HOW_IT_WORKS,
  TRUST_BADGES,
  WHY_CHOOSE_US
} from '../shared/home-content';
import { FaqItem } from '../shared/components/faq-accordion/faq-accordion.component';
import {
  displayCoursePrice,
  primaryCourseImageUrl,
  resolveMediaUrl
} from '../utils/media-url';

export interface HeroContent {
  title: string;
  subtitle: string;
  /** Resolved hero image URL from Admin homepage_hero.image / image_url */
  image: string;
  image_url: string;
  ctaPrimaryText: string;
  ctaPrimaryLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
}

export interface HowItWorksStep {
  step: number;
  title: string;
  desc: string;
}

export interface HomeFeature {
  title: string;
  line: string;
}

export interface HomeStatistic {
  value: string;
  suffix?: string;
  label: string;
}

/** Home display shape — keeps API field aliases for templates. */
export interface HomeTestimonial {
  customer_name: string;
  course_name: string;
  rating: number;
  review: string;
  photo_url: string;
  /** @deprecated aliases — prefer API names above */
  name: string;
  type: string;
  text: string;
  photo: string;
}

/**
 * Display helper for course cards. Canonical API fields are preferred:
 * image_url, price_label, features, is_featured.
 * Legacy aliases (image, price, includes, featured) mirror the same values.
 */
export interface CourseDisplay {
  id: string;
  slug: string;
  name: string;
  price_label: string;
  amount_inr?: number;
  price: string;
  duration_label: string;
  duration: string;
  difficulty: string;
  tagline: string;
  description: string;
  highlights: string[];
  features: string[];
  includes: string[];
  image_url: string;
  image: string;
  bannerImage: string;
  thumbnailImage: string;
  mobileImage: string;
  is_featured?: boolean;
  featured?: boolean;
  cta_text: string;
  ctaText: string;
  cta_link: string;
  ctaPath: string;
  ctaQuery: Record<string, string>;
}

const DEFAULT_HERO: HeroContent = {
  title: 'Learn to Ride with Confidence.',
  subtitle:
    'Professional Scooty & Bike Training in Kolkata for Beginners, Women, Students and Working Professionals.',
  image: '',
  image_url: '',
  ctaPrimaryText: 'Book Your Training',
  ctaPrimaryLink: '/booking',
  ctaSecondaryText: 'Find Your Course',
  ctaSecondaryLink: '/courses'
};

@Injectable({ providedIn: 'root' })
export class CmsContentService {
  constructor(
    private settings: SettingsService,
    private coursesApi: CourseService,
    private testimonialsApi: TestimonialService
  ) {}

  settings$(): Observable<SiteSettings> {
    return this.settings.settings$;
  }

  hero$(): Observable<HeroContent> {
    return this.settings.settings$.pipe(map((s) => this.getHero(s)));
  }

  trustBadges$(): Observable<string[]> {
    return this.settings.settings$.pipe(map((s) => this.parseArray(s.homepage_trust_badges, TRUST_BADGES)));
  }

  features$(): Observable<HomeFeature[]> {
    return this.settings.settings$.pipe(map((s) => this.parseArray(s.homepage_features, WHY_CHOOSE_US)));
  }

  howItWorks$(): Observable<HowItWorksStep[]> {
    return this.settings.settings$.pipe(map((s) => this.parseArray(s.homepage_how_it_works, HOW_IT_WORKS)));
  }

  statistics$(): Observable<HomeStatistic[]> {
    return this.settings.settings$.pipe(map((s) => this.parseArray<HomeStatistic>(s.homepage_statistics, [])));
  }

  testimonials$(): Observable<HomeTestimonial[]> {
    return from(this.loadTestimonials());
  }

  async loadTestimonials(): Promise<HomeTestimonial[]> {
    try {
      const rows = await this.testimonialsApi.list(true);
      if (rows?.length) {
        return rows.map((t) => {
          const photo_url = resolveMediaUrl(t.photo_url, '', this.testimonialsApi.apiBaseUrl);
          return {
            customer_name: t.customer_name,
            course_name: t.course_name || 'Student',
            rating: t.rating || 5,
            review: t.review,
            photo_url,
            name: t.customer_name,
            type: t.course_name || 'Student',
            text: t.review,
            photo: photo_url
          };
        });
      }
    } catch {
      /* fall through to settings (Admin CMS) or empty */
    }
    // Settings homepage_testimonials is Admin-managed, not frontend seed data
    return this.parseArray(this.settings.getSettings().homepage_testimonials, []).map((t: any) => {
      const name = t.customer_name || t.name || '';
      const review = t.review || t.text || '';
      const course_name = t.course_name || t.type || 'Student';
      const photo_url = resolveMediaUrl(t.photo_url || t.photo, '');
      return {
        customer_name: name,
        course_name,
        rating: t.rating || 5,
        review,
        photo_url,
        name,
        type: course_name,
        text: review,
        photo: photo_url
      };
    });
  }

  coursesFaqs$(): Observable<FaqItem[]> {
    return this.settings.settings$.pipe(
      map((s) =>
        this.parseArray<FaqItem>(s.faqs_courses, [
          { question: 'Minimum age?', answer: '18+, with a valid learner’s licence.' },
          { question: 'Do I need my own bike?', answer: 'No — we provide training bikes and scooties.' },
          { question: 'Missed a class?', answer: 'Reschedule free when slots allow.' }
        ])
      )
    );
  }

  contactFaqs$(): Observable<FaqItem[]> {
    return this.settings.settings$.pipe(
      map((s) =>
        this.parseArray<FaqItem>(s.faqs_contact, [
          { question: 'Documents needed?', answer: 'Learner’s licence + ID (Aadhaar/PAN).' },
          { question: 'Reschedule?', answer: 'Yes — up to 24 hours before, free.' },
          { question: 'Refunds?', answer: 'Full refund if cancelled 48 hours before first session.' }
        ])
      )
    );
  }

  async loadCourses(activeOnly = true): Promise<CourseDisplay[]> {
    try {
      const rows = await this.coursesApi.list(activeOnly);
      return rows.map((course, index) => this.mapCourse(course, index));
    } catch {
      return [];
    }
  }

  getHero(settings = this.settings.getSettings()): HeroContent {
    const parsed = this.parseObject<Partial<HeroContent> & { image_url?: string }>(
      settings.homepage_hero,
      {}
    );
    const image = resolveMediaUrl(parsed.image_url || parsed.image, DEFAULT_HERO.image);
    return {
      ...DEFAULT_HERO,
      title: parsed.title || DEFAULT_HERO.title,
      subtitle: parsed.subtitle || DEFAULT_HERO.subtitle,
      image,
      image_url: image,
      ctaPrimaryText: parsed.ctaPrimaryText || DEFAULT_HERO.ctaPrimaryText,
      ctaPrimaryLink: parsed.ctaPrimaryLink || DEFAULT_HERO.ctaPrimaryLink,
      ctaSecondaryText: parsed.ctaSecondaryText || DEFAULT_HERO.ctaSecondaryText,
      ctaSecondaryLink: parsed.ctaSecondaryLink || DEFAULT_HERO.ctaSecondaryLink
    };
  }

  mapCourse(c: Course, _index: number): CourseDisplay {
    const features = Array.isArray(c.features) ? c.features : [];
    const highlights = Array.isArray(c.highlights) ? c.highlights : [];
    const rawLink = (c.cta_link || `/booking?course=${c.slug}`).trim();
    const [pathPart, queryPart = ''] = rawLink.split('?');
    const ctaQuery: Record<string, string> = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((value, key) => {
        ctaQuery[key] = value;
      });
    }

    // Single source of truth: primary Admin image_url (never prefer stale thumbnails).
    const image_url = resolveMediaUrl(primaryCourseImageUrl(c), '', this.coursesApi.apiBaseUrl);
    const price_label = displayCoursePrice(c);
    const duration_label = c.duration_label || '';
    const cta_text = c.cta_text || 'Book now';
    const cta_link = rawLink;

    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      price_label,
      amount_inr: c.amount_inr,
      price: price_label,
      duration_label,
      duration: duration_label,
      difficulty: c.difficulty || 'Beginner',
      tagline: c.tagline || c.description || '',
      description: c.description || '',
      highlights,
      features,
      includes: features,
      image_url,
      image: image_url,
      bannerImage: image_url,
      thumbnailImage: image_url,
      mobileImage: image_url,
      is_featured: !!c.is_featured,
      featured: !!c.is_featured,
      cta_text,
      ctaText: cta_text,
      cta_link,
      ctaPath: pathPart || '/booking',
      ctaQuery
    };
  }

  /**
   * Resolve an Admin/API image URL. Does not invent /media paths.
   * Missing or known-broken CDN placeholders → empty string (caller hides <img>).
   */
  resolveImageUrl(imageUrl?: string | null, fallback = ''): string {
    return resolveMediaUrl(imageUrl, fallback, this.coursesApi.apiBaseUrl);
  }

  whatsappUrl(settings = this.settings.getSettings()): string {
    const phone = (settings.contact_whatsapp || settings.contact_phone || '').replace(/\D/g, '');
    const num = phone.startsWith('91') ? phone : `91${phone.replace(/^0/, '')}`;
    return `https://wa.me/${num}?text=${encodeURIComponent('Hi, I would like to enquire about scooty/bike training.')}`;
  }

  mapsUrl(settings = this.settings.getSettings()): string {
    if (settings.contact_maps_url) return settings.contact_maps_url;
    const q = encodeURIComponent(`${settings.site_name} ${settings.contact_address || 'Kolkata'}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  private parseObject<T>(value: unknown, fallback: T): T {
    if (value == null) return fallback;
    if (typeof value === 'string') {
      try {
        return { ...fallback, ...JSON.parse(value) };
      } catch {
        return fallback;
      }
    }
    if (typeof value === 'object') return { ...fallback, ...(value as T) };
    return fallback;
  }

  parseArray<T>(value: unknown, fallback: T[]): T[] {
    if (value == null) return fallback;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) && parsed.length ? parsed : fallback;
      } catch {
        return fallback;
      }
    }
    if (Array.isArray(value) && value.length) return value as T[];
    return fallback;
  }
}
