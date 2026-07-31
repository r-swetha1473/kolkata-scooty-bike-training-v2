import { Injectable, NgZone, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MotionService implements OnDestroy {
  private observer: IntersectionObserver | null = null;
  private reducedMotion = false;

  constructor(private zone: NgZone) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Call after route enter or whenever async content mounts (courses/gallery/etc.). */
  initScrollReveal(root: ParentNode = document): void {
    const selector =
      '.motion-reveal, .motion-reveal-left, .motion-reveal-scale, .motion-stagger';

    if (this.reducedMotion) {
      root.querySelectorAll(selector).forEach((el) => el.classList.add('motion-visible'));
      return;
    }

    this.ensureObserver();
    root.querySelectorAll(selector).forEach((el) => {
      if (el.classList.contains('motion-visible')) return;
      // Already in (or near) viewport — show immediately to avoid blank grids
      const rect = (el as HTMLElement).getBoundingClientRect?.();
      if (rect && rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add('motion-visible');
        return;
      }
      this.observer?.observe(el);
    });
  }

  /** Alias for pages that load data after AfterViewInit. */
  refreshAfterContent(root: ParentNode = document): void {
    // Defer one frame so *ngIf nodes exist
    requestAnimationFrame(() => this.initScrollReveal(root));
  }

  private ensureObserver(): void {
    if (this.observer) return;
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('motion-visible');
              this.observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
      );
    });
  }

  animateCounter(element: HTMLElement, target: number, suffix = '', duration = 1200): void {
    if (this.reducedMotion) {
      element.textContent = `${target}${suffix}`;
      element.classList.add('motion-counted');
      return;
    }

    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (target - from) * eased);
      element.textContent = `${value}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.classList.add('motion-counted');
      }
    };
    requestAnimationFrame(step);
  }

  observeCounters(root: ParentNode = document): void {
    if (this.reducedMotion) {
      root.querySelectorAll('[data-count]').forEach((el) => {
        const node = el as HTMLElement;
        const target = parseInt(node.dataset['count'] || '0', 10);
        const suffix = node.dataset['suffix'] || '';
        node.textContent = `${target}${suffix}`;
        node.classList.add('motion-counted');
      });
      return;
    }

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          if (el.dataset['counted']) return;
          el.dataset['counted'] = 'true';
          const target = parseInt(el.dataset['count'] || '0', 10);
          const suffix = el.dataset['suffix'] || '';
          this.animateCounter(el, target, suffix);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    root.querySelectorAll('[data-count]').forEach((el) => counterObserver.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
