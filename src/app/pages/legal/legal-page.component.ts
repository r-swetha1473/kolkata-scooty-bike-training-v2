import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeoService } from '../../services/seo.service';

type LegalSlug = 'terms' | 'privacy' | 'cookies' | 'refund-policy' | 'cancellation-policy';

interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const DOCS: Record<LegalSlug, LegalDoc> = {
  terms: {
    title: 'Terms of Service',
    updated: '27 July 2026',
    intro:
      'These Terms of Service govern your use of the Kolkata Scooty Bike Training website, booking portal, and training services. By creating an account or booking a session, you agree to these terms.',
    sections: [
      {
        heading: '1. About us',
        paragraphs: [
          'Kolkata Scooty Bike Training (“we”, “us”) provides professional scooty and motorcycle training at our Kolkata branches. Contact details are listed on our Contact page.'
        ]
      },
      {
        heading: '2. Eligibility',
        paragraphs: [
          'You must provide accurate contact details and be legally able to take training on public roads under applicable Indian laws and RTO rules. Minors may train only with documented guardian consent where required.'
        ]
      },
      {
        heading: '3. Bookings and payments',
        paragraphs: [
          'Slots are confirmed subject to availability, branch capacity, and payment verification. Fees displayed at booking are indicative until payment is verified. Manual UPI or cash/manual payments may require staff confirmation before a session is fully confirmed.'
        ]
      },
      {
        heading: '4. Conduct and safety',
        bullets: [
          'Follow trainer instructions and branch safety rules at all times.',
          'Wear appropriate footwear and clothing; helmets must be worn as directed.',
          'Do not attend under the influence of alcohol or impairing substances.',
          'Respect trainers, staff, vehicles, and other learners.'
        ]
      },
      {
        heading: '5. Liability',
        paragraphs: [
          'Training involves inherent risks of riding. To the fullest extent permitted by law, we are not liable for indirect or consequential losses. Nothing in these terms excludes liability that cannot be limited under applicable law.'
        ]
      },
      {
        heading: '6. Account suspension',
        paragraphs: [
          'We may suspend or deactivate accounts for misuse, fraudulent payments, abusive behaviour, or prolonged inactivity, subject to our reactivation process where applicable.'
        ]
      },
      {
        heading: '7. Changes',
        paragraphs: [
          'We may update these terms from time to time. Continued use of the service after updates constitutes acceptance of the revised terms.'
        ]
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '27 July 2026',
    intro:
      'This Privacy Policy explains how Kolkata Scooty Bike Training collects, uses, and protects personal information when you use our website and customer portal.',
    sections: [
      {
        heading: '1. Information we collect',
        bullets: [
          'Account details: name, email, phone number, and profile photo (if provided via Google sign-in).',
          'Booking and payment records: course, branch, slot times, payment status, and receipt references.',
          'Technical data: browser type, device, IP address (for security and audit logs), and cookie preferences.'
        ]
      },
      {
        heading: '2. How we use your information',
        bullets: [
          'To create and manage your account and bookings.',
          'To verify payments and communicate about sessions, cancellations, and reschedules.',
          'To improve our website, scheduling, and customer support.',
          'To meet legal, audit, and security obligations.'
        ]
      },
      {
        heading: '3. Sharing',
        paragraphs: [
          'We do not sell your personal data. We may share information with authorised staff, payment processors, hosting providers, and authorities when required by law or to operate the service securely.'
        ]
      },
      {
        heading: '4. Retention',
        paragraphs: [
          'We retain booking and payment records for operational and compliance needs. You may request correction of inaccurate profile details via your Profile page or by contacting us.'
        ]
      },
      {
        heading: '5. Your choices',
        paragraphs: [
          'You can update your phone number in Profile, manage cookie preferences via our cookie banner, and request account-related help through Contact.'
        ]
      },
      {
        heading: '6. Contact',
        paragraphs: [
          'For privacy questions, email us using the address on the Contact page and include “Privacy” in the subject line.'
        ]
      }
    ]
  },
  cookies: {
    title: 'Cookie Policy',
    updated: '27 July 2026',
    intro:
      'This Cookie Policy describes how Kolkata Scooty Bike Training uses cookies and similar storage on our website.',
    sections: [
      {
        heading: '1. What are cookies?',
        paragraphs: [
          'Cookies are small text files stored on your device. We also use localStorage for preferences such as cookie consent and profile notification settings.'
        ]
      },
      {
        heading: '2. Essential cookies',
        paragraphs: [
          'Essential cookies and storage keep you signed in, protect sessions, remember cookie choices, and enable core booking features. These cannot be switched off if you use the site.'
        ]
      },
      {
        heading: '3. Analytics cookies',
        paragraphs: [
          'If you allow analytics in cookie preferences, we may use analytics to understand page usage and improve the site. Analytics remain off until you opt in.'
        ]
      },
      {
        heading: '4. Managing preferences',
        paragraphs: [
          'You can Accept, Reject (non-essential), or Manage Preferences using the cookie banner. You can clear site data in your browser to reset consent.'
        ]
      }
    ]
  },
  'refund-policy': {
    title: 'Refund Policy',
    updated: '27 July 2026',
    intro:
      'This Refund Policy applies to training fees paid to Kolkata Scooty Bike Training through our booking portal or at a branch.',
    sections: [
      {
        heading: '1. General',
        paragraphs: [
          'Fees are generally non-refundable once a session is confirmed and payment is verified, except as described below or required by law.'
        ]
      },
      {
        heading: '2. Eligible refunds',
        bullets: [
          'Duplicate or accidental payments verified by our team.',
          'Sessions cancelled by us due to trainer unavailability, branch closure, or operational issues, where a suitable reschedule cannot be offered.',
          'Other cases approved in writing by management on a case-by-case basis.'
        ]
      },
      {
        heading: '3. How to request',
        paragraphs: [
          'Contact us via the Contact page within 7 days of the payment date, with your booking reference, payment reference, and reason. Refunds, when approved, are processed to the original payment method where possible and may take several business days.'
        ]
      },
      {
        heading: '4. Non-refundable situations',
        bullets: [
          'No-shows or late arrivals without timely cancellation.',
          'Change of mind after a confirmed and delivered session.',
          'Rejected receipts for incomplete or invalid payment proofs (re-upload may be allowed instead).'
        ]
      }
    ]
  },
  'cancellation-policy': {
    title: 'Cancellation Policy',
    updated: '27 July 2026',
    intro:
      'This Cancellation Policy explains how customers and Kolkata Scooty Bike Training may cancel or reschedule booked training sessions.',
    sections: [
      {
        heading: '1. Customer cancellations',
        paragraphs: [
          'You may cancel eligible upcoming bookings from My Bookings when the Cancel action is available. Cancel as early as possible so the slot can be offered to another learner.'
        ]
      },
      {
        heading: '2. Reschedule requests',
        paragraphs: [
          'Use Request reschedule / Reschedule from My Bookings (or Contact) for confirmed future sessions. Reschedules depend on slot availability, branch capacity, and staff approval.'
        ]
      },
      {
        heading: '3. Centre cancellations',
        paragraphs: [
          'We may cancel or move a session for weather, safety, vehicle/trainer issues, or holidays. We will notify you using your registered contact details and offer an alternative slot when possible.'
        ]
      },
      {
        heading: '4. Late arrival and no-show',
        paragraphs: [
          'Arriving significantly late may result in a shortened or forfeited session at the trainer’s discretion. Repeated no-shows may lead to booking restrictions.'
        ]
      },
      {
        heading: '5. Fees',
        paragraphs: [
          'Cancellation and refund outcomes follow this policy together with our Refund Policy. Verified payments for sessions cancelled by us without a suitable alternative may qualify for refund or credit.'
        ]
      }
    ]
  }
};

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="legal-page page-enter" *ngIf="doc">
      <p class="ks-eyebrow">Legal</p>
      <h1>{{ doc.title }}</h1>
      <p class="updated">Last updated: {{ doc.updated }}</p>
      <p class="intro">{{ doc.intro }}</p>

      <section *ngFor="let s of doc.sections">
        <h2>{{ s.heading }}</h2>
        <p *ngFor="let p of s.paragraphs">{{ p }}</p>
        <ul *ngIf="s.bullets?.length">
          <li *ngFor="let b of s.bullets">{{ b }}</li>
        </ul>
      </section>

      <p class="legal-nav">
        <a routerLink="/terms">Terms</a>
        <a routerLink="/privacy">Privacy</a>
        <a routerLink="/cookies">Cookies</a>
        <a routerLink="/refund-policy">Refund</a>
        <a routerLink="/cancellation-policy">Cancellation</a>
        <a routerLink="/contact">Contact</a>
      </p>
    </div>
  `,
  styles: [`
    .updated {
      margin: 0 0 1rem;
      color: var(--color-muted);
      font-size: 0.875rem;
    }
    .intro {
      margin: 0 0 1.5rem;
      font-size: 1.05rem;
    }
    .legal-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-border);
    }
    .legal-nav a {
      color: var(--color-primary);
      font-weight: 600;
      text-decoration: none;
      font-size: 0.9rem;
    }
  `]
})
export class LegalPageComponent implements OnInit, OnDestroy {
  doc: LegalDoc | null = null;
  slug: LegalSlug = 'terms';
  private dataSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.dataSub = this.route.data.subscribe((data) => {
      const page = (data['page'] || 'terms') as LegalSlug;
      this.slug = page;
      this.doc = DOCS[page] || DOCS.terms;
      this.seo.setPage({
        title: this.doc.title,
        description: this.doc.intro.slice(0, 155),
        path: `/${page}`
      });
    });
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
  }
}
