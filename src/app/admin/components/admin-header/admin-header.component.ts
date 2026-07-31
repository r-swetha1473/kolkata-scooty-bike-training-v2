import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { NotificationService, AdminNotification } from '../../../services/notification.service';
import { ThemeService } from '../../../services/theme.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

interface CommandItem {
  label: string;
  route?: string;
  action?: () => void;
  shortcut?: string;
}

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BrandLogoComponent],
  template: `
    <header class="admin-header">
      <div class="header-container">
        <div class="header-left">
          <button
            type="button"
            class="menu-toggle"
            (click)="menuToggle.emit()"
            aria-label="Toggle navigation menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <a routerLink="/admin" class="logo admin-brand-logo" aria-label="Admin home">
            <app-brand-logo variant="mark" [markSize]="32"></app-brand-logo>
            <div class="logo-text">
              <h1>Kolkata Scooty</h1>
              <span class="logo-subtitle">Admin Panel</span>
            </div>
          </a>
        </div>

        <div class="header-right">
          <div class="header-search" (click)="openCommandPalette()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="search-placeholder">Search…</span>
            <kbd>⌘K</kbd>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="theme-toggle-btn"
              (click)="toggleTheme()"
              [attr.aria-label]="themeService.getTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
              title="Toggle theme">
              <svg *ngIf="themeService.getTheme() === 'light'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <svg *ngIf="themeService.getTheme() === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </button>
            <div class="notification-menu" *ngIf="canViewNotifications">
              <button
                type="button"
                class="notification-btn"
                (click)="toggleNotifications($event)"
                title="Notifications"
                aria-label="Notifications">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span class="notification-badge" *ngIf="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
              </button>
              <div class="notification-panel" *ngIf="showNotifications" (click)="$event.stopPropagation()">
                <div class="notification-panel-header">
                  <span>Notifications</span>
                  <button type="button" class="mark-all-btn" *ngIf="unreadCount > 0" (click)="markAllRead()">Mark all read</button>
                </div>
                <div class="notification-loading" *ngIf="notificationsLoading">Loading…</div>
                <div class="notification-empty" *ngIf="!notificationsLoading && notifications.length === 0">
                  No notifications
                </div>
                <div class="notification-list" *ngIf="!notificationsLoading && notifications.length > 0">
                  <button
                    type="button"
                    class="notification-item"
                    *ngFor="let n of notifications"
                    [class.unread]="!n.is_read"
                    (click)="openNotification(n)">
                    <div class="notification-title">{{ n.title }}</div>
                    <div class="notification-body" *ngIf="n.body">{{ n.body }}</div>
                    <div class="notification-time">{{ formatTime(n.created_at) }}</div>
                  </button>
                </div>
              </div>
            </div>

            <button class="action-btn" (click)="goToSite()" title="Go to main site">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span class="text">Site</span>
            </button>
            
            <div class="user-menu profile-menu" *ngIf="auth.userProfile$ | async as profile">
              <button
                type="button"
                class="profile-trigger"
                (click)="toggleUserMenu($event)"
                [attr.aria-expanded]="showUserMenu"
                aria-haspopup="menu">
                <span class="profile-avatar" [class.has-image]="!!profile.avatar_url">
                  <img *ngIf="profile.avatar_url" [src]="profile.avatar_url" [alt]="profile.full_name" />
                  <span *ngIf="!profile.avatar_url">{{ profile.full_name.charAt(0).toUpperCase() }}</span>
                </span>
                <span class="profile-meta">
                  <span class="profile-name">{{ profile.full_name }}</span>
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
                    <span *ngIf="!profile.avatar_url">{{ profile.full_name.charAt(0).toUpperCase() }}</span>
                  </span>
                  <div>
                    <p class="profile-dropdown-name">{{ profile.full_name }}</p>
                    <p class="profile-dropdown-role">{{ profile.role | titlecase }}</p>
                  </div>
                </div>
                <div class="profile-dropdown-divider"></div>
                <nav class="profile-dropdown-nav">
                  <button type="button" class="profile-dropdown-item" role="menuitem" (click)="goToProfile()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile
                  </button>
                  <button type="button" class="profile-dropdown-item" role="menuitem" (click)="goToSettings()" *ngIf="profile.role === 'superadmin'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Settings
                  </button>
                  <button type="button" class="profile-dropdown-item" role="menuitem" (click)="openNotificationsMenu()" *ngIf="canViewNotifications">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Notifications
                    <span class="profile-menu-badge" *ngIf="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
                  </button>
                  <button type="button" class="profile-dropdown-item" role="menuitem" (click)="goToChangePassword()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Change Password
                  </button>
                  <div class="profile-dropdown-divider"></div>
                  <button type="button" class="profile-dropdown-item danger" role="menuitem" (click)="logout()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Logout
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="command-palette-backdrop" *ngIf="showCommandPalette" (click)="closeCommandPalette()">
      <div class="command-palette" (click)="$event.stopPropagation()" role="dialog" aria-label="Command palette">
        <input
          #commandInput
          type="text"
          class="command-palette-input"
          placeholder="Search pages and actions…"
          [(ngModel)]="commandQuery"
          (keydown.escape)="closeCommandPalette()"
          (keydown.enter)="runCommand(filteredCommands[0])" />
        <div class="command-palette-list">
          <button
            type="button"
            class="command-palette-item"
            *ngFor="let cmd of filteredCommands"
            (click)="runCommand(cmd)">
            {{ cmd.label }}
            <kbd *ngIf="cmd.shortcut">{{ cmd.shortcut }}</kbd>
          </button>
          <div class="command-empty" *ngIf="filteredCommands.length === 0">No results</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-header {
      background: var(--color-card);
      border-bottom: 1px solid var(--color-border);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      height: var(--admin-header-h);
    }

    .header-container {
      max-width: 100%;
      margin: 0 auto;
      padding: 0 var(--space-6);
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    .menu-toggle {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-card);
      color: var(--color-ink-soft);
      cursor: pointer;
    }

    .menu-toggle:hover { background: var(--color-bg); }

    .logo-text h1 {
      margin: 0;
      font-size: var(--text-body);
      font-weight: 700;
      color: var(--color-ink);
      line-height: 1.2;
    }

    .logo-subtitle {
      font-size: 0.6875rem;
      color: var(--color-muted);
      font-weight: 500;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex: 1;
      justify-content: flex-end;
    }

    .header-search {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-muted);
      font-size: var(--text-body-sm);
      cursor: pointer;
      min-width: 200px;
      max-width: 280px;
      transition: border-color var(--dur-fast), background var(--dur-fast);
    }

    .header-search:hover {
      border-color: #CBD5E1;
      background: var(--color-card);
    }

    .search-placeholder { flex: 1; }

    .header-search kbd,
    .command-palette-item kbd {
      font-size: 0.625rem;
      font-weight: 500;
      color: var(--color-muted);
      background: var(--color-line-soft);
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .command-empty {
      padding: var(--space-6);
      text-align: center;
      color: var(--color-muted);
      font-size: var(--text-body-sm);
    }

    .notification-menu { position: relative; }

    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-card);
      color: var(--color-ink-soft);
      cursor: pointer;
      transition: background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast);
    }

    .theme-toggle-btn:hover {
      background: var(--color-bg);
      border-color: #CBD5E1;
      color: var(--color-primary);
    }

    .notification-btn,
    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-card);
      color: var(--color-muted);
      cursor: pointer;
      transition: background var(--dur-fast), border-color var(--dur-fast);
    }

    .action-btn {
      width: auto;
      padding: 0 0.75rem;
      gap: var(--space-2);
      font-size: var(--text-body-sm);
      font-weight: 500;
    }

    .notification-btn:hover,
    .action-btn:hover {
      background: var(--color-bg);
      border-color: #CBD5E1;
      color: var(--color-ink);
    }

    .notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: var(--color-danger);
      color: #fff;
      font-size: 0.625rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: min(360px, 90vw);
      max-height: 400px;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 1100;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .notification-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
      font-weight: 600;
      font-size: var(--text-body-sm);
      color: var(--color-ink);
    }

    .mark-all-btn {
      border: none;
      background: none;
      color: var(--color-primary);
      font-size: var(--text-body-sm);
      font-weight: 500;
      cursor: pointer;
    }

    .notification-item {
      display: block;
      width: 100%;
      text-align: left;
      border: none;
      border-bottom: 1px solid var(--color-line-soft);
      background: var(--color-card);
      padding: var(--space-3) var(--space-4);
      cursor: pointer;
      transition: background var(--dur-fast);
    }

    .notification-item:hover { background: var(--color-bg); }
    .notification-item.unread { background: rgba(37, 99, 235, 0.05); }

    .notification-title {
      font-size: var(--text-body-sm);
      font-weight: 600;
      color: var(--color-ink);
      margin-bottom: 2px;
    }

    .notification-body {
      font-size: 0.75rem;
      color: var(--color-muted);
      margin-bottom: 2px;
    }

    .notification-time { font-size: 0.6875rem; color: var(--color-muted); }

    .notification-empty,
    .notification-loading {
      padding: var(--space-6);
      text-align: center;
      color: var(--color-muted);
      font-size: var(--text-body-sm);
    }

    .user-menu { position: relative; }

    .profile-trigger {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.3rem 0.75rem 0.3rem 0.3rem;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition:
        background var(--motion-duration-fast),
        border-color var(--motion-duration-fast),
        box-shadow var(--motion-duration-fast);
    }

    .profile-trigger:hover,
    .profile-trigger[aria-expanded="true"] {
      background: var(--color-bg);
      border-color: #CBD5E1;
      box-shadow: var(--shadow-sm);
    }

    .profile-chevron {
      color: var(--color-muted);
      transition: transform var(--motion-duration-fast) var(--motion-ease-out);
      flex-shrink: 0;
    }

    .profile-chevron.open { transform: rotate(180deg); }

    @media (max-width: 768px) {
      .menu-toggle { display: inline-flex; }
      .header-container { padding: 0 var(--space-4); }
      .header-search { display: none; }
      .action-btn .text, .profile-meta { display: none; }
      .profile-trigger { padding: 0.25rem; border-radius: var(--radius-md); }
    }
  `]
})
export class AdminHeaderComponent implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();
  showUserMenu = false;
  showNotifications = false;
  showCommandPalette = false;
  commandQuery = '';
  unreadCount = 0;
  notifications: AdminNotification[] = [];
  notificationsLoading = false;
  canViewNotifications = false;

  commands: CommandItem[] = [
    { label: 'Dashboard', route: '/admin' },
    { label: 'Bookings', route: '/admin/bookings' },
    { label: 'Payments', route: '/admin/payments' },
    { label: 'Branches', route: '/admin/branches' },
    { label: 'Users', route: '/admin/users' },
    { label: 'Settings', route: '/admin/settings' },
    { label: 'Back to public site', route: '/' },
  ];

  get filteredCommands(): CommandItem[] {
    const q = this.commandQuery.trim().toLowerCase();
    if (!q) return this.commands;
    return this.commands.filter((c) => c.label.toLowerCase().includes(q));
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openCommandPalette();
    }
  }
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private profileSub: Subscription | null = null;
  private unreadSub: Subscription | null = null;
  private openPanelSub: Subscription | null = null;
  private closeNotificationsHandler = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-menu')) {
      this.showNotifications = false;
    }
  };

  constructor(
    public auth: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    this.profileSub = this.auth.userProfile$.subscribe((profile) => {
      const canView =
        !!profile && ['admin', 'superadmin', 'subadmin'].includes(profile.role);
      if (canView && !this.canViewNotifications) {
        this.canViewNotifications = true;
        void this.notificationService.refreshUnreadCount();
        if (!this.unreadSub) {
          this.unreadSub = this.notificationService.unreadCount$.subscribe((c) => {
            this.unreadCount = c;
          });
        }
        if (!this.pollTimer) {
          this.pollTimer = setInterval(() => {
            this.notificationService.refreshUnreadCount();
          }, 60000);
        }
      } else if (!canView) {
        this.canViewNotifications = false;
        this.unreadCount = 0;
      }
    });

    this.openPanelSub = this.notificationService.openPanel$.subscribe(() => {
      if (!this.canViewNotifications) return;
      this.showUserMenu = false;
      this.showNotifications = true;
      void this.loadNotificationList();
      setTimeout(() => {
        document.addEventListener('click', this.closeNotificationsHandler);
      }, 0);
    });
  }

  private async loadNotificationList(): Promise<void> {
    this.notificationsLoading = true;
    try {
      const res = await this.notificationService.listNotifications({ limit: 25 });
      this.notifications = res.notifications;
    } catch {
      this.notifications = [];
    } finally {
      this.notificationsLoading = false;
    }
  }

  ngOnDestroy() {
    this.profileSub?.unsubscribe();
    this.unreadSub?.unsubscribe();
    this.openPanelSub?.unsubscribe();
    if (this.pollTimer) clearInterval(this.pollTimer);
    document.removeEventListener('click', this.closeNotificationsHandler);
  }

  async toggleNotifications(event: Event) {
    event.stopPropagation();
    this.showUserMenu = false;
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      await this.loadNotificationList();
      setTimeout(() => {
        document.addEventListener('click', this.closeNotificationsHandler);
      }, 0);
    } else {
      document.removeEventListener('click', this.closeNotificationsHandler);
    }
  }

  async openNotification(n: AdminNotification) {
    if (!n.is_read) {
      await this.notificationService.markRead(n.id);
      n.is_read = true;
    }
    this.showNotifications = false;
    if (n.entity_type === 'booking') {
      this.router.navigate(['/admin/bookings']);
    } else if (n.entity_type === 'user') {
      this.router.navigate(['/admin/users']);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  async markAllRead() {
    await this.notificationService.markAllRead();
    this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  openCommandPalette() {
    this.showCommandPalette = true;
    this.commandQuery = '';
    this.showUserMenu = false;
    this.showNotifications = false;
  }

  closeCommandPalette() {
    this.showCommandPalette = false;
    this.commandQuery = '';
  }

  runCommand(cmd?: CommandItem) {
    if (!cmd) return;
    this.closeCommandPalette();
    if (cmd.route) {
      this.router.navigate([cmd.route]);
    } else if (cmd.action) {
      cmd.action();
    }
  }

  toggleUserMenu(event?: Event) {
    event?.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;

    if (this.showUserMenu) {
      setTimeout(() => {
        document.addEventListener('click', this.closeUserMenu);
      }, 0);
    } else {
      document.removeEventListener('click', this.closeUserMenu);
    }
  }

  closeUserMenu = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-menu')) {
      this.showUserMenu = false;
      document.removeEventListener('click', this.closeUserMenu);
    }
  };

  goToProfile() {
    this.showUserMenu = false;
    this.router.navigate(['/profile']);
  }

  goToSettings() {
    this.showUserMenu = false;
    this.router.navigate(['/admin/settings']);
  }

  goToChangePassword() {
    this.showUserMenu = false;
    this.router.navigate(['/admin/change-password']);
  }

  async openNotificationsMenu() {
    this.showUserMenu = false;
    this.showNotifications = true;
    await this.loadNotificationList();
    setTimeout(() => {
      document.addEventListener('click', this.closeNotificationsHandler);
    }, 0);
  }

  goToSite() {
    this.showUserMenu = false;
    this.router.navigate(['/']);
  }

  async logout() {
    this.showUserMenu = false;
    await this.auth.signOut();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}

