import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Branch, BranchService } from '../../services/branch.service';
import {
  CmsContentService,
  CourseDisplay,
  HeroContent,
  HomeTestimonial
} from '../../services/cms-content.service';
import {
  HERO_BRAND,
  HOME_STATISTICS,
  HOW_IT_WORKS,
  TRUST_BADGES,
  WHY_CHOOSE_US
} from '../../shared/home-content';
import { MotionService } from '../../services/motion.service';
import { SeoService } from '../../services/seo.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly heroBrand = HERO_BRAND;
  hero: HeroContent = {
    title: '',
    subtitle: '',
    image: '',
    image_url: '',
    ctaPrimaryText: 'Book Your Training',
    ctaPrimaryLink: '/booking',
    ctaSecondaryText: 'Find Your Course',
    ctaSecondaryLink: '/courses'
  };
  courses: CourseDisplay[] = [];
  coursesLoading = true;
  readonly whyChoose = WHY_CHOOSE_US;
  readonly howItWorks = HOW_IT_WORKS;
  readonly trustBadges = TRUST_BADGES;
  testimonials: HomeTestimonial[] = [];
  readonly statistics = HOME_STATISTICS;
  branches: Branch[] = [];
  branchesLoading = true;

  private subs: Subscription[] = [];

  constructor(
    private branchesApi: BranchService,
    private cms: CmsContentService,
    private motion: MotionService,
    private seo: SeoService
  ) {}

  async ngOnInit() {
    this.seo.setPage({
      title: 'Kolkata Scooty Bike Training — Learn. Ride. Grow.',
      description:
        'Professional scooty and bike training in Kolkata. Women-friendly classes, certified instructors, road confidence courses, and easy online booking.',
      path: '/',
      keywords:
        'Kolkata Scooty, two wheeler training, scooty training Kolkata, bike training Kolkata, women scooty classes, learn to ride',
      image: '/social-preview.png'
    });
    this.seo.setBreadcrumbSchema([{ name: 'Home', path: '/' }]);

    this.hero = this.cms.getHero();
    this.subs.push(
      this.cms.settings$().subscribe((s) => {
        this.seo.setOrganizationSchema([
          s.social_facebook,
          s.social_instagram,
          s.social_youtube,
          s.social_linkedin || ''
        ].filter(Boolean));
      })
    );
    this.subs.push(this.cms.hero$().subscribe((h) => (this.hero = h)));

    try {
      this.courses = await this.cms.loadCourses(true);
    } finally {
      this.coursesLoading = false;
      this.motion.refreshAfterContent();
    }

    this.testimonials = await this.cms.loadTestimonials();
    this.motion.refreshAfterContent();

    try {
      this.branches = (await this.branchesApi.list(true)).slice(0, 3);
    } catch {
      this.branches = [];
    } finally {
      this.branchesLoading = false;
      this.motion.refreshAfterContent();
      this.motion.observeCounters();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.motion.initScrollReveal();
      this.motion.observeCounters();
    }, 80);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  stars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  mapsQuery(branch: Branch): string {
    return encodeURIComponent(`${branch.name} ${branch.address || ''} Kolkata`);
  }

  mapsUrl(branch: Branch): string {
    return this.branchesApi.mapsUrl(branch);
  }

  branchImage(branch: Branch): string {
    return this.branchesApi.resolveImageUrl(branch.image_url) || '';
  }
}
