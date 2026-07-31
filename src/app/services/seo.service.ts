import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';

const SITE_NAME = 'Kolkata Scooty Bike Training';
const DEFAULT_OG = '/social-preview.png';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  private get origin(): string {
    const fromEnv = (environment as { siteUrl?: string }).siteUrl;
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://kolkata-scooty-bike-training.vercel.app';
  }

  setPage(opts: {
    title: string;
    description?: string;
    path?: string;
    image?: string;
    keywords?: string;
    noIndex?: boolean;
  }) {
    const fullTitle = opts.title.includes('Kolkata Scooty')
      ? opts.title
      : `${opts.title} | ${SITE_NAME}`;
    this.title.setTitle(fullTitle);

    if (opts.description) {
      this.meta.updateTag({ name: 'description', content: opts.description });
      this.meta.updateTag({ property: 'og:description', content: opts.description });
      this.meta.updateTag({ name: 'twitter:description', content: opts.description });
    }
    if (opts.keywords) {
      this.meta.updateTag({ name: 'keywords', content: opts.keywords });
    }

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });

    const path = opts.path || '/';
    const url = `${this.origin}${path.startsWith('/') ? path : `/${path}`}`;
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:url', content: url });
    this.setCanonical(url);

    const imagePath = opts.image || DEFAULT_OG;
    const imageUrl = imagePath.startsWith('http') ? imagePath : `${this.origin}${imagePath}`;
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });

    if (opts.noIndex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex,nofollow' });
    } else {
      this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    }
  }

  setCanonical(url: string) {
    if (typeof document === 'undefined') return;
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  setJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  setOrganizationSchema(sameAs: string[] = []) {
    this.setJsonLd('ld-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: this.origin,
      logo: `${this.origin}/assets/brand/mark.svg`,
      sameAs: sameAs.filter(Boolean)
    });
  }

  setArticleSchema(article: {
    title: string;
    description?: string;
    image?: string;
    path: string;
    datePublished?: string;
    dateModified?: string;
    authorName?: string;
  }) {
    this.setJsonLd('ld-article', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      image: article.image,
      author: {
        '@type': 'Person',
        name: article.authorName || 'Kolkata Scooty Team'
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: {
          '@type': 'ImageObject',
          url: `${this.origin}/assets/brand/mark.svg`
        }
      },
      mainEntityOfPage: `${this.origin}${article.path}`,
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished
    });
  }

  setLocalBusinessSchema(branch: {
    name: string;
    address?: string;
    phone?: string;
    mapsUrl?: string;
    openingHours?: string;
  }) {
    this.setJsonLd('ld-local-business', {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: branch.name,
      image: `${this.origin}/social-preview.png`,
      address: branch.address
        ? {
            '@type': 'PostalAddress',
            streetAddress: branch.address,
            addressLocality: 'Kolkata',
            addressRegion: 'West Bengal',
            addressCountry: 'IN'
          }
        : undefined,
      telephone: branch.phone,
      url: this.origin,
      hasMap: branch.mapsUrl,
      openingHours: branch.openingHours
    });
  }

  setBreadcrumbSchema(items: { name: string; path: string }[]) {
    this.setJsonLd('ld-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${this.origin}${item.path}`
      }))
    });
  }

  setFaqSchema(faqs: { question: string; answer: string }[]) {
    if (!faqs?.length) return;
    this.setJsonLd('ld-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer }
      }))
    });
  }
}
