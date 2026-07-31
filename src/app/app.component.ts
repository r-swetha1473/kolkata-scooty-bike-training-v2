import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';
import { SettingsService, SiteSettings } from './services/settings.service';
import { MotionService } from './services/motion.service';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './components/toast/toast.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { CookieConsentComponent } from './components/cookie-consent/cookie-consent.component';
import { BrandLogoComponent } from './shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    ToastComponent,
    ConfirmDialogComponent,
    CookieConsentComponent,
    BrandLogoComponent
  ],
  template: `
    <div class="app-container">
      <header class="site-header" *ngIf="!isAdminRoute"
        [class.scrolled]="isScrolled"
        [class.menu-open]="menuOpen"
        [class.header-transparent]="isHomeRoute && !isScrolled">
        <div class="container header-inner">
          <a routerLink="/" class="brand" (click)="closeMenu()" aria-label="Kolkata Scooty Bike Training home">
            <app-brand-logo
              [variant]="isHomeRoute && !isScrolled ? 'light' : 'default'"
              [style.--brand-logo-height]="'40px'">
            </app-brand-logo>
          </a>

          <button
            type="button"
            class="menu-toggle"
            (click)="toggleMenu()"
            [attr.aria-expanded]="menuOpen"
            aria-controls="primary-nav"
            aria-label="Toggle menu">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav id="primary-nav" class="primary-nav" [class.open]="menuOpen" aria-label="Primary">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-underline" (click)="closeMenu()">Home</a>
            <a routerLink="/courses" routerLinkActive="active" class="nav-underline" (click)="closeMenu()">Courses</a>
            <a routerLink="/pricing" routerLinkActive="active" class="nav-underline" (click)="closeMenu()">Pricing</a>
            <a routerLink="/branches" routerLinkActive="active" class="nav-underline" (click)="closeMenu()">Branches</a>
            <a routerLink="/gallery" routerLinkActive="active" class="nav-underline" (click)="closeMenu()">Gallery</a>
            <a routerLink="/blogs" routerLinkActive="active" class="nav-underline" (click)="closeMenu()">Blog</a>
            <a routerLink="/trainers" routerLinkActive="active" class="nav-underline" (click)="closeMenu()">Trainers</a>
            <a routerLink="/about" routerLinkActive="active" class="nav-underline" (click)="closeMenu()">About</a>
            <a routerLink="/contact" routerLinkActive="active" class="nav-underline" (click)="closeMenu()">Contact</a>

            <a routerLink="/booking" routerLinkActive="active" class="nav-cta" (click)="closeMenu()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Book Now
            </a>

            <div class="user-menu profile-menu" *ngIf="authService.isAuthenticated$ | async as profile; else loginButton">
              <button type="button" class="profile-trigger" (click)="toggleUserMenu($event)" [attr.aria-expanded]="showUserMenu" aria-haspopup="menu">
                <span class="profile-avatar" [class.has-image]="!!profile.avatar_url">
                  <img *ngIf="profile.avatar_url" [src]="profile.avatar_url" [alt]="profile.full_name" />
                  <span *ngIf="!profile.avatar_url">{{ getUserInitial() }}</span>
                </span>
                <span class="profile-meta">
                  <span class="profile-name">{{ profile.full_name || getUserName() }}</span>
                  <span class="profile-role">{{ profile.role | titlecase }}</span>
                </span>
                <svg class="profile-chevron" [class.open]="showUserMenu" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="profile-dropdown motion-dropdown" *ngIf="showUserMenu" role="menu" (click)="$event.stopPropagation()">
                <div class="profile-dropdown-header">
                  <span class="profile-avatar lg" [class.has-image]="!!profile.avatar_url">
                    <img *ngIf="profile.avatar_url" [src]="profile.avatar_url" [alt]="profile.full_name" />
                    <span *ngIf="!profile.avatar_url">{{ getUserInitial() }}</span>
                  </span>
                  <div>
                    <p class="profile-dropdown-name">{{ profile.full_name || getUserName() }}</p>
                    <p class="profile-dropdown-role">{{ profile.role | titlecase }}</p>
                  </div>
                </div>
                <div class="profile-dropdown-divider"></div>
                <nav class="profile-dropdown-nav">
                  <a routerLink="/account" role="menuitem" class="profile-dropdown-item" (click)="closeMenus()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Dashboard
                  </a>
                  <a routerLink="/profile" role="menuitem" class="profile-dropdown-item" (click)="closeMenus()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile
                  </a>
                  <a routerLink="/my-bookings" role="menuitem" class="profile-dropdown-item" (click)="closeMenus()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    My Bookings
                  </a>
                  <a routerLink="/my-payments" role="menuitem" class="profile-dropdown-item" (click)="closeMenus()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    Payments
                  </a>
                  <div class="profile-dropdown-divider"></div>
                  <button type="button" class="profile-dropdown-item danger" role="menuitem" (click)="signOut()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Logout
                  </button>
                </nav>
              </div>
            </div>
            <ng-template #loginButton>
              <button type="button" class="btn-signin" (click)="signIn(); closeMenu()">Sign In</button>
            </ng-template>
          </nav>
        </div>
        <div class="nav-backdrop" *ngIf="menuOpen" (click)="closeMenu()" aria-hidden="true"></div>
      </header>

      <main [class.no-padding-top]="isAdminRoute || isHomeRoute">
        <router-outlet></router-outlet>
      </main>

      <app-toast *ngIf="!isAdminRoute"></app-toast>
      <app-confirm-dialog *ngIf="!isAdminRoute"></app-confirm-dialog>

      <footer class="site-footer xp-footer" *ngIf="!isAdminRoute">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <a routerLink="/" class="footer-logo" aria-label="Home">
                <app-brand-logo variant="light" [style.--brand-logo-height]="'44px'"></app-brand-logo>
              </a>
              <p class="footer-tagline">Premium scooty &amp; bike training in Kolkata. Safe, professional, beginner-friendly.</p>
              <p class="footer-about">{{ settings.about_text }}</p>
              <div class="footer-social" *ngIf="hasSocialLinks()">
                <a *ngIf="settings.social_facebook" [href]="settings.social_facebook" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v8h4v-8h3l1-4h-4V9c0-.6.4-1 1-1z"/></svg>
                </a>
                <a *ngIf="settings.social_instagram" [href]="settings.social_instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                </a>
                <a *ngIf="settings.social_youtube" [href]="settings.social_youtube" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.5s-.2-1.6-.9-2.3c-.8-.9-1.8-.9-2.2-1C16.7 4 12 4 12 4s-4.7 0-7.9.2c-.5.1-1.4.1-2.2 1C1.2 5.9 1 7.5 1 7.5S.8 9.4.8 11.2v1.6c0 1.9.2 3.7.2 3.7s.2 1.6.9 2.3c.8.9 1.9.8 2.4.9 1.7.2 7.7.2 7.7.2s4.7 0 7.9-.2c.5-.1 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.7v-1.6c0-1.8-.2-3.7-.2-3.7zM9.8 14.8V8.9l6.2 2.95-6.2 2.95z"/></svg>
                </a>
                <a *ngIf="settings.social_linkedin" [href]="settings.social_linkedin" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" class="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 8.5H3V21h3.5V8.5zM4.8 3A2 2 0 1 0 4.8 7a2 2 0 0 0 0-4zM21 21h-3.5v-6.2c0-1.6-.6-2.7-2.1-2.7-1.1 0-1.8.8-2.1 1.5-.1.3-.1.6-.1.9V21H9.8s.05-11.1 0-12.5H13v1.8c.5-.7 1.3-1.8 3.3-1.8 2.4 0 4.2 1.6 4.2 5V21z"/></svg>
                </a>
                <a [href]="whatsappUrl()" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.6 6.6 0 0 1-1.9-1.2 7.2 7.2 0 0 1-1.3-1.7c-.1-.3 0-.4.1-.5l.4-.4.2-.3.1-.3-.1-.4c0-.1-.5-1.2-.7-1.6s-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3s-.8.8-.8 1.9.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4 2.3.9 2.3.6 2.7.6s1.2-.1 1.4-.8.2-1.1.1-1.2-.2-.2-.4-.3z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4>Quick links</h4>
              <ul>
                <li><a routerLink="/">Home</a></li>
                <li><a routerLink="/about">About</a></li>
                <li><a routerLink="/trainers">Trainers</a></li>
                <li><a routerLink="/contact">Contact</a></li>
                <li><a routerLink="/my-bookings">My Bookings</a></li>
              </ul>
            </div>
            <div>
              <h4>Legal</h4>
              <ul>
                <li><a routerLink="/terms">Terms</a></li>
                <li><a routerLink="/privacy">Privacy</a></li>
                <li><a routerLink="/refund-policy">Refund</a></li>
                <li><a routerLink="/cancellation-policy">Cancellation</a></li>
                <li><a routerLink="/cookies">Cookies</a></li>
                <li><a routerLink="/faq">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4>Courses</h4>
              <ul>
                <li><a routerLink="/courses">All courses</a></li>
                <li><a routerLink="/pricing">Pricing</a></li>
                <li><a routerLink="/booking">Book training</a></li>
                <li><a routerLink="/faq">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h4>Branches &amp; contact</h4>
              <ul>
                <li><a routerLink="/branches">All branches</a></li>
                <li><a [href]="whatsappUrl()" target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>
                <li><a [href]="mapsUrl()" target="_blank" rel="noopener noreferrer">Google Maps</a></li>
                <li><a [href]="'tel:' + settings.contact_phone">{{ settings.contact_phone }}</a></li>
                <li><a [href]="'mailto:' + settings.contact_email">{{ settings.contact_email }}</a></li>
                <li>{{ settings.contact_address }}</li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <p>{{ settings.footer_copyright }}</p>
            <a routerLink="/booking" class="footer-cta ks-btn ks-btn-primary">Book Your Training</a>
          </div>
        </div>
      </footer>

      <app-cookie-consent></app-cookie-consent>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      background: var(--color-bg);
      overflow-x: clip;
    }

    main {
      flex: 1 0 auto;
      display: flex;
      flex-direction: column;
      padding-top: var(--header-h);
      min-height: 0;
    }

    main.no-padding-top { padding-top: 0; }

    .site-header {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 1000;
      height: var(--header-h);
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(14px) saturate(1.2);
      border-bottom: 1px solid transparent;
      transition:
        background var(--motion-duration-base) var(--motion-ease-out),
        border-color var(--motion-duration-base),
        box-shadow var(--motion-duration-base);
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) {
      background: transparent;
      backdrop-filter: none;
      border-bottom-color: transparent;
      box-shadow: none;
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .brand-text strong {
      color: #fff;
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .brand-text em {
      color: rgba(255, 255, 255, 0.65);
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .primary-nav > a:not(.nav-cta) {
      color: rgba(255, 255, 255, 0.88);
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .primary-nav > a:not(.nav-cta):hover {
      color: #fff;
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .primary-nav > a.active:not(.nav-cta) {
      color: #fff;
      background: transparent;
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .nav-underline::after {
      background: #fff;
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .menu-toggle {
      border-color: rgba(255, 255, 255, 0.35);
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .menu-toggle span {
      background: #fff;
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .btn-signin {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.35);
      color: #fff;
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .profile-trigger {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.35);
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .profile-name {
      color: #fff;
    }

    .site-header.header-transparent:not(.scrolled):not(.menu-open) .profile-role,
    .site-header.header-transparent:not(.scrolled):not(.menu-open) .profile-chevron {
      color: rgba(255, 255, 255, 0.72);
    }

    .site-header.scrolled {
      border-bottom-color: var(--color-border);
      box-shadow: var(--shadow-sm);
      background: rgba(255, 255, 255, 0.96);
    }

    .header-inner {
      height: var(--header-h);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
      color: inherit;
      z-index: 1002;
    }

    .brand-mark {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      display: grid;
      place-items: center;
      background: var(--color-primary);
      color: #fff;
      font-weight: 700;
      font-size: 0.75rem;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .brand-text strong {
      font-size: 0.9375rem;
      color: var(--color-ink);
      font-weight: 700;
    }

    .brand-text em {
      font-style: normal;
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-muted);
    }

    .primary-nav {
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }

    .primary-nav > a:not(.nav-cta) {
      text-decoration: none;
      color: var(--color-muted);
      font-size: var(--text-body-sm);
      font-weight: 500;
      padding: 0.5rem 0.625rem;
      border-radius: var(--radius-md);
      transition: color var(--dur-fast), background var(--dur-fast);
    }

    .primary-nav > a:not(.nav-cta):hover {
      color: var(--color-ink);
    }

    .primary-nav > a.active:not(.nav-cta) {
      color: var(--color-primary);
      font-weight: 600;
      background: transparent;
    }

    .nav-cta {
      margin-left: 0.5rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--color-primary) !important;
      color: #fff !important;
      padding: 0.55rem 1.125rem !important;
      border-radius: var(--radius-lg);
      text-decoration: none;
      font-size: var(--text-body-sm);
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
      transition:
        background var(--motion-duration-fast),
        box-shadow var(--motion-duration-fast),
        transform var(--motion-duration-fast);
    }

    .nav-cta:hover {
      background: var(--color-primary-hover) !important;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45);
      transform: translateY(-1px);
    }

    .nav-cta:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }

    .btn-signin {
      min-height: 40px;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-card);
      color: var(--color-ink);
      font-weight: 600;
      font-size: var(--text-body-sm);
      cursor: pointer;
      transition: border-color var(--dur-fast), background var(--dur-fast);
    }

    .btn-signin:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .user-menu { position: relative; margin-left: 0.25rem; }

    @media (max-width: 900px) {
      .profile-meta { display: none; }
      .profile-trigger { padding: 0.25rem; border-radius: var(--radius-md); }
    }

    .menu-toggle {
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      width: 40px;
      height: 40px;
      background: none;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      z-index: 1002;
      padding: 10px;
    }

    .menu-toggle span {
      display: block;
      height: 2px;
      width: 100%;
      background: var(--color-ink);
      border-radius: 2px;
      transition: transform var(--dur-med), opacity var(--dur-fast);
    }

    .site-header.menu-open .menu-toggle span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .site-header.menu-open .menu-toggle span:nth-child(2) { opacity: 0; }
    .site-header.menu-open .menu-toggle span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

    .nav-backdrop { display: none; }

    .site-footer {
      background: var(--color-dark);
      color: rgba(255, 255, 255, 0.65);
      padding: clamp(4rem, 8vw, 5.5rem) 0 var(--space-8);
      margin-top: auto;
    }

    .footer-tagline {
      margin: 0 0 0.75rem;
      font-size: var(--text-body);
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      max-width: 22rem;
    }

    .footer-about {
      margin: 0 0 1.25rem;
      line-height: var(--leading-relaxed);
      font-size: var(--text-body-sm);
      max-width: 26rem;
      color: rgba(255, 255, 255, 0.55);
    }

    .footer-social {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .footer-social a,
    .footer-social .social-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-md);
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: background var(--dur-fast), color var(--dur-fast);
    }

    .footer-social a:hover,
    .footer-social .social-link:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 1.4fr 0.9fr 0.9fr 0.9fr 1.1fr;
      gap: clamp(2rem, 4vw, 3rem);
      margin-bottom: var(--space-8);
      padding-bottom: var(--space-8);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .footer-logo {
      font-size: 1.125rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.75rem;
    }

    .footer-brand p {
      margin: 0 0 1rem;
      line-height: var(--leading-relaxed);
      font-size: var(--text-body-sm);
      max-width: 26rem;
    }

    .site-footer h4 {
      margin: 0 0 0.75rem;
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .site-footer ul { list-style: none; padding: 0; margin: 0; }
    .site-footer li { margin-bottom: 0.5rem; font-size: var(--text-body-sm); }

    .site-footer a {
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      transition: color var(--dur-fast);
    }

    .site-footer a:hover { color: #fff; }

    .social-links { display: flex; flex-wrap: wrap; gap: 0.5rem; }

    .social-links a {
      padding: 0.375rem 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-md);
      font-size: var(--text-body-sm);
    }

    .social-links a:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding-top: var(--space-6);
      font-size: var(--text-body-sm);
    }

    .footer-bottom .footer-cta {
      min-height: 48px;
      padding-inline: 1.5rem;
      font-size: var(--text-body);
      font-weight: 600;
      color: #fff !important;
      background: var(--color-primary) !important;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
    }

    .footer-bottom .footer-cta:hover {
      background: var(--color-primary-hover) !important;
      color: #fff !important;
      box-shadow: 0 12px 28px rgba(37, 99, 235, 0.5);
    }

    .footer-bottom .footer-cta:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
    }

    @media (max-width: 900px) {
      .menu-toggle { display: flex; }

      .nav-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: var(--color-overlay);
        z-index: 1000;
        animation: ds-fade-in 0.2s ease;
      }

      .primary-nav {
        position: fixed;
        top: 0;
        right: 0;
        width: min(100%, 340px);
        height: 100vh;
        background: var(--color-card);
        flex-direction: column;
        align-items: stretch;
        gap: 0.25rem;
        padding: calc(var(--header-h) + 1rem) 1.25rem 2rem;
        box-shadow: var(--shadow-xl);
        transform: translateX(105%);
        transition: transform var(--dur-med) var(--ease-out);
        z-index: 1001;
        overflow-y: auto;
      }

      .primary-nav.open { transform: translateX(0); }

      .primary-nav a, .btn-signin, .profile-trigger { width: 100%; justify-content: flex-start; }
      .primary-nav a { padding: 0.75rem 0.5rem; border-bottom: 1px solid var(--color-border); }
      .nav-cta { text-align: center !important; justify-content: center; margin-top: 0.75rem; }

      .profile-dropdown {
        position: static;
        box-shadow: none;
        border: none;
        margin-top: 0.5rem;
        animation: none;
      }

      .footer-grid { grid-template-columns: 1fr 1fr; gap: var(--space-8); }
    }

    @media (max-width: 560px) {
      .footer-grid { grid-template-columns: 1fr; }
      .footer-bottom { flex-direction: column; align-items: flex-start; }
      .brand-text em { display: none; }
    }
  `]
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  isScrolled = false;
  menuOpen = false;
  showUserMenu = false;
  isAdminRoute = false;
  isHomeRoute = false;
  settings: SiteSettings = {
    site_name: 'Kolkata Scooty Bike Training',
    site_logo: '/assets/brand/logo.svg',
    contact_email: 'info@kolkatascootytraining.com',
    contact_phone: '+91 98765 43210',
    contact_address: 'Salt Lake, Kolkata, West Bengal',
    social_facebook: 'https://www.facebook.com/kolkatascootytraining',
    social_instagram: 'https://www.instagram.com/kolkatascootytraining',
    social_youtube: 'https://www.youtube.com/@kolkatascootytraining',
    social_linkedin: 'https://www.linkedin.com/company/kolkata-scooty-bike-training',
    footer_copyright: '© 2026 Kolkata Scooty Bike Training. All rights reserved.',
    about_text: 'Kolkata Scooty helps beginners and returning riders learn scooty and bike skills safely — with patient coaches and practical road confidence.'
  };

  private settingsSub: Subscription | null = null;
  private routerSub: Subscription | null = null;
  private onScroll = () => {
    if (!this.isAdminRoute) {
      this.isScrolled = window.scrollY > 24;
    }
  };
  private onDocClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-menu')) {
      this.showUserMenu = false;
    }
  };

  constructor(
    public authService: AuthService,
    private router: Router,
    private settingsService: SettingsService,
    private motion: MotionService
  ) {}

  async ngOnInit() {
    this.settingsSub = this.settingsService.settings$.subscribe(settings => {
      this.settings = settings;
    });

    this.checkAdminRoute(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkAdminRoute(event.url);
        this.closeMenu();
        setTimeout(() => this.refreshMotion(), 120);
        if (event.url === '/profile' && !this.authService.isAuthenticated()) {
          this.authService.reloadUserProfile();
        }
      });

    window.addEventListener('scroll', this.onScroll, { passive: true });
    document.addEventListener('click', this.onDocClick);
  }

  ngAfterViewInit(): void {
    this.refreshMotion();
  }

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    window.removeEventListener('scroll', this.onScroll);
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('click', this.closeUserMenuHandler);
    document.body.style.overflow = '';
  }

  private refreshMotion(): void {
    this.motion.initScrollReveal();
    this.motion.observeCounters();
  }

  hasSocialLinks(): boolean {
    return !!(
      this.settings.social_facebook ||
      this.settings.social_instagram ||
      this.settings.social_youtube ||
      this.settings.social_linkedin ||
      this.settings.contact_whatsapp ||
      this.settings.contact_phone
    );
  }

  private checkAdminRoute(url: string) {
    const path = url.split('?')[0].split('#')[0];
    this.isAdminRoute = path.startsWith('/admin') && path !== '/admin/login' && !path.startsWith('/admin/login');
    this.isHomeRoute = path === '/' || path === '';
  }

  whatsappUrl(): string {
    const settings = this.settingsService.getSettings();
    const phone = (settings.contact_whatsapp || settings.contact_phone || '').replace(/\D/g, '');
    const num = phone.startsWith('91') ? phone : `91${phone.replace(/^0/, '')}`;
    return `https://wa.me/${num}?text=${encodeURIComponent('Hi, I would like to enquire about scooty/bike training.')}`;
  }

  mapsUrl(): string {
    const settings = this.settingsService.getSettings();
    if (settings.contact_maps_url) return settings.contact_maps_url;
    const q = encodeURIComponent(`${settings.site_name} ${settings.contact_address || 'Kolkata'}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  closeMenu() {
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      setTimeout(() => document.addEventListener('click', this.closeUserMenuHandler), 0);
    } else {
      document.removeEventListener('click', this.closeUserMenuHandler);
    }
  }

  private closeUserMenuHandler = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-menu')) {
      this.showUserMenu = false;
      document.removeEventListener('click', this.closeUserMenuHandler);
    }
  };

  closeMenus() {
    this.closeMenu();
    this.showUserMenu = false;
  }

  getUserName(): string {
    const profile = this.authService.getUserProfile();
    return profile?.full_name || profile?.email || 'User';
  }

  getUserInitial(): string {
    return this.getUserName().charAt(0).toUpperCase();
  }

  async signIn() {
    try {
      await this.authService.signInWithGoogle();
    } catch {
      /* redirect handles errors */
    }
  }

  async signOut() {
    try {
      await this.authService.signOut();
      this.showUserMenu = false;
    } catch {
      /* session cleared in AuthService.finally */
    }
  }
}
