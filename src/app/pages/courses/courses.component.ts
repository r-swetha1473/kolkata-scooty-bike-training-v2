import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeoService } from '../../services/seo.service';
import { CmsContentService, CourseDisplay } from '../../services/cms-content.service';
import { MotionService } from '../../services/motion.service';
import { FaqAccordionComponent, FaqItem } from '../../shared/components/faq-accordion/faq-accordion.component';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterLink, FaqAccordionComponent],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit, AfterViewInit, OnDestroy {
  courses: CourseDisplay[] = [];
  faqs: FaqItem[] = [];
  loading = true;
  private faqsSub: Subscription | null = null;

  constructor(
    private seo: SeoService,
    private cms: CmsContentService,
    private motion: MotionService
  ) {}

  async ngOnInit() {
    this.seo.setPage({
      title: 'Courses',
      description: 'Beginner to advanced scooty and bike training in Kolkata. Book online.',
      path: '/courses'
    });

    this.faqsSub = this.cms.coursesFaqs$().subscribe((faqs) => {
      this.faqs = faqs;
      this.seo.setJsonLd('faq-ld', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer }
        }))
      });
    });

    try {
      this.courses = await this.cms.loadCourses(true);
    } finally {
      this.loading = false;
      this.motion.refreshAfterContent();
    }
  }

  ngOnDestroy(): void {
    this.faqsSub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.motion.initScrollReveal(), 80);
  }
}
