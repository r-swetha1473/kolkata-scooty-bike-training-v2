import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-admin-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, BrandLogoComponent],
  template: `
    <footer class="admin-footer">
      <div class="footer-container">
        <div class="footer-brand">
          <app-brand-logo variant="mark" [markSize]="28"></app-brand-logo>
          <p class="footer-text">&copy; {{ currentYear }} Kolkata Scooty Bike Training · Admin</p>
        </div>
        <nav class="footer-links" aria-label="Admin footer">
          <a routerLink="/admin">Dashboard</a>
          <a routerLink="/admin/reports">Reports</a>
          <a routerLink="/">Public site</a>
        </nav>
      </div>
    </footer>
  `,
  styles: [`
    .admin-footer {
      background: var(--color-card);
      margin-top: auto;
      border-top: 1px solid var(--color-border);
    }

    .footer-container {
      max-width: 100%;
      margin: 0 auto;
      padding: var(--space-4) var(--space-8);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .footer-text {
      margin: 0;
      color: var(--color-muted);
      font-size: var(--text-body-sm);
    }

    .footer-links a {
      color: var(--color-muted);
      text-decoration: none;
      font-size: var(--text-body-sm);
      font-weight: 500;
      margin-left: 1rem;
    }

    .footer-links a:hover {
      color: var(--color-primary);
    }

    @media (max-width: 768px) {
      .footer-container {
        padding: 14px 16px;
        flex-direction: column;
        align-items: flex-start;
      }
      .footer-links a { margin-left: 0; margin-right: 1rem; }
    }
  `]
})
export class AdminFooterComponent {
  currentYear = new Date().getFullYear();
}
