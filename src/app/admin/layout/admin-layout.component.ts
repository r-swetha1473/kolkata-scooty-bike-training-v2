import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { MotionService } from '../../services/motion.service';
import { ThemeService } from '../../services/theme.service';
import { AdminHeaderComponent } from '../components/admin-header/admin-header.component';
import { AdminFooterComponent } from '../components/admin-footer/admin-footer.component';
import { ToastComponent } from '../../components/toast/toast.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { AdminNavIconComponent } from '../components/admin-nav-icon/admin-nav-icon.component';
import { NotificationService } from '../../services/notification.service';
import { UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AdminHeaderComponent,
    AdminFooterComponent,
    ToastComponent,
    ConfirmDialogComponent,
    AdminNavIconComponent
  ],
  template: `
    <div class="admin-layout" [class.sidebar-open]="sidebarOpen">
      <app-admin-header (menuToggle)="toggleSidebar()"></app-admin-header>

      <div
        class="sidebar-overlay"
        *ngIf="sidebarOpen"
        (click)="closeSidebar()"
        aria-hidden="true">
      </div>
      
      <aside class="sidebar" [class.open]="sidebarOpen">
        <div class="sidebar-header">
          <h2>Admin Panel</h2>
          <div class="user-info" *ngIf="auth.userProfile$ | async as profile">
            <div class="user-avatar">{{ profile.full_name.charAt(0) }}</div>
            <div class="user-details">
              <div class="user-name">{{ profile.full_name }}</div>
              <div class="user-role">{{ profile.role }}</div>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav" *ngIf="auth.userProfile$ | async as profile">
          <div class="admin-nav-group">Overview</div>
          <a *ngIf="perms.canViewModule('dashboard')" routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="dashboard"></app-admin-nav-icon>
            <span class="nav-label">Dashboard</span>
          </a>
          <a *ngIf="perms.canViewModule('dashboard')" routerLink="/admin/reports" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="reports"></app-admin-nav-icon>
            <span class="nav-label">Reports</span>
          </a>
          <a *ngIf="perms.canViewModule('dashboard')" routerLink="/admin/scheduling-health" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="health"></app-admin-nav-icon>
            <span class="nav-label">Engine Health</span>
          </a>

          <div class="admin-nav-group">Operations</div>
          <a *ngIf="perms.canViewModule('bookings')" routerLink="/admin/bookings" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="bookings"></app-admin-nav-icon>
            <span class="nav-label">Bookings</span>
          </a>
          <a *ngIf="perms.can('bookings', 'create')" routerLink="/admin/offline-bookings" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="bookings"></app-admin-nav-icon>
            <span class="nav-label">Offline Bookings</span>
          </a>
          <a *ngIf="perms.canViewModule('payments')" routerLink="/admin/payments" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="payments"></app-admin-nav-icon>
            <span class="nav-label">Payment Approval</span>
          </a>
          <a *ngIf="perms.canViewModule('slots')" routerLink="/admin/slots" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="slots"></app-admin-nav-icon>
            <span class="nav-label">Schedule</span>
          </a>
          <a *ngIf="perms.canViewModule('branches')" routerLink="/admin/branches" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="branches"></app-admin-nav-icon>
            <span class="nav-label">Branches</span>
          </a>
          <a *ngIf="perms.canViewModule('trainers')" routerLink="/admin/trainers" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="trainers"></app-admin-nav-icon>
            <span class="nav-label">Trainers</span>
          </a>
          <a *ngIf="perms.canViewModule('vehicles')" routerLink="/admin/vehicles" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="vehicles"></app-admin-nav-icon>
            <span class="nav-label">Vehicles</span>
          </a>
          <a *ngIf="perms.canViewModule('users')" routerLink="/admin/users" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="users"></app-admin-nav-icon>
                <span class="nav-label">Users</span>
          </a>
          <a *ngIf="perms.canViewModule('users')" routerLink="/admin/reactivation-requests" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="reactivation"></app-admin-nav-icon>
            <span class="nav-label">Reactivation</span>
          </a>

          <div class="admin-nav-group">Content</div>
          <a *ngIf="perms.canViewModule('gallery')" routerLink="/admin/gallery" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="gallery"></app-admin-nav-icon>
            <span class="nav-label">Gallery</span>
          </a>
          <a *ngIf="perms.canViewModule('testimonials')" routerLink="/admin/testimonials" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="testimonials"></app-admin-nav-icon>
            <span class="nav-label">Testimonials</span>
          </a>
          <a *ngIf="perms.canViewModule('blogs')" routerLink="/admin/blogs" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="blogs"></app-admin-nav-icon>
            <span class="nav-label">Blogs</span>
          </a>
          <a *ngIf="perms.canViewModule('coupons')" routerLink="/admin/coupons" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="coupons"></app-admin-nav-icon>
            <span class="nav-label">Coupons</span>
          </a>
          <a *ngIf="perms.canViewModule('settings') || profile.role === 'superadmin'" routerLink="/admin/courses" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="courses"></app-admin-nav-icon>
            <span class="nav-label">Courses</span>
          </a>

          <div class="admin-nav-group">Tracking</div>
          <a *ngIf="profile.role === 'superadmin'" routerLink="/admin/audit-logs" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="audit"></app-admin-nav-icon>
            <span class="nav-label">Audit & activity</span>
          </a>
          <button *ngIf="isStaff(profile)" type="button" class="nav-item nav-button" (click)="openNotifications()">
            <app-admin-nav-icon name="notifications"></app-admin-nav-icon>
            <span class="nav-label">Notifications</span>
          </button>

          <div class="admin-nav-group">System</div>
          <a *ngIf="profile.role === 'superadmin'" routerLink="/admin/sub-admins" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="sub-admins"></app-admin-nav-icon>
            <span class="nav-label">Sub Admins</span>
          </a>
          <a *ngIf="profile.role === 'superadmin'" routerLink="/admin/settings" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <app-admin-nav-icon name="settings"></app-admin-nav-icon>
            <span class="nav-label">Settings</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/admin/change-password" class="nav-item profile-link" (click)="closeSidebar()">
            <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span class="nav-label">Change Password</span>
          </a>
          <button class="btn-secondary" (click)="goToSite()">Back to Site</button>
          <button class="btn-danger" (click)="logout()">Logout</button>
        </div>
      </aside>

      <div class="content-wrapper">
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
        
        <app-admin-footer></app-admin-footer>
      </div>
      <app-toast></app-toast>
      <app-confirm-dialog></app-confirm-dialog>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      background: var(--color-bg);
      font-family: var(--font-family);
    }

    .content-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      margin-left: var(--sidebar-w);
      margin-top: var(--admin-header-h);
      height: calc(100vh - var(--admin-header-h));
      height: calc(100dvh - var(--admin-header-h));
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
    }

    .sidebar {
      width: var(--sidebar-w);
      background: var(--color-card);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      z-index: 90;
      height: calc(100vh - var(--admin-header-h));
      height: calc(100dvh - var(--admin-header-h));
      top: var(--admin-header-h);
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      transition: transform var(--motion-duration-base) var(--motion-ease-out);
    }

    .sidebar-header {
      padding: var(--space-5);
      border-bottom: 1px solid var(--color-border);
    }

    .sidebar-header h2 {
      margin: 0 0 var(--space-4);
      font-size: var(--text-body);
      color: var(--color-ink);
      font-weight: 700;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: rgba(37, 99, 235, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
      font-weight: 600;
      font-size: var(--text-body-sm);
    }

    .user-details { flex: 1; min-width: 0; }

    .user-name {
      font-weight: 600;
      color: var(--color-ink);
      font-size: var(--text-body-sm);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.75rem;
      color: var(--color-muted);
      text-transform: capitalize;
    }

    .sidebar-nav {
      flex: 1;
      padding: var(--space-3) var(--space-3) var(--space-4);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 0.625rem 0.875rem;
      margin-bottom: 3px;
      border-radius: var(--radius-md);
      color: var(--color-muted);
      text-decoration: none;
      transition: background var(--dur-fast), color var(--dur-fast);
      cursor: pointer;
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      font: inherit;
      font-size: var(--text-body-sm);
      font-weight: 500;
    }

    .nav-item:hover,
    .nav-button:hover {
      background: var(--color-bg);
      color: var(--color-ink);
    }

    .nav-item.active {
      background: rgba(37, 99, 235, 0.08);
      color: var(--color-primary);
      font-weight: 600;
    }

    .nav-icon {
      width: 18px;
      height: 18px;
      stroke-width: 2;
      flex-shrink: 0;
    }

    .nav-label { font-weight: inherit; }

    .sidebar-footer {
      padding: var(--space-4);
      border-top: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .profile-link { text-decoration: none; margin-bottom: var(--space-1); }

    .btn-secondary {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border);
      background: var(--color-card);
      color: var(--color-ink-soft);
      border-radius: var(--radius-md);
      font-size: var(--text-body-sm);
      font-weight: 500;
      cursor: pointer;
      transition: background var(--dur-fast), border-color var(--dur-fast);
    }

    .btn-secondary:hover {
      background: var(--color-bg);
      border-color: #CBD5E1;
    }

    .btn-danger {
      padding: 0.5rem 1rem;
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: transparent;
      color: var(--color-danger);
      border-radius: var(--radius-md);
      font-size: var(--text-body-sm);
      font-weight: 500;
      cursor: pointer;
      transition: background var(--dur-fast);
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.08);
    }

    .main-content {
      flex: 1 0 auto;
      padding: var(--space-6); /* 24px desktop */
      overflow-x: hidden;
      animation: ds-fade-up 0.3s ease both;
    }

    .sidebar-overlay { display: none; }

    @media (max-width: 1024px) {
      .main-content { padding: var(--space-6) var(--space-5); }
    }

    @media (max-width: 768px) {
      .sidebar-overlay {
        display: block;
        position: fixed;
        inset: var(--admin-header-h) 0 0 0;
        background: var(--color-overlay);
        z-index: 150;
      }

      .sidebar {
        width: min(var(--sidebar-w), 85vw);
        position: fixed;
        height: calc(100vh - var(--admin-header-h));
        top: var(--admin-header-h);
        left: 0;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform var(--dur-med) var(--ease-out);
        box-shadow: var(--shadow-xl);
      }

      .sidebar.open { transform: translateX(0); }

      .content-wrapper {
        margin-left: 0;
        margin-top: var(--admin-header-h);
        height: calc(100vh - var(--admin-header-h));
        height: calc(100dvh - var(--admin-header-h));
      }

      .main-content { padding: var(--space-4); }
    }

    @media (max-width: 425px) {
      .sidebar { width: min(260px, 90vw); }
      .sidebar-header { padding: var(--space-4); }
      .main-content { padding: var(--space-3); }
    }

    @media (max-width: 320px) {
      .main-content { padding: var(--space-2); }
    }
  `]
})
export class AdminLayoutComponent implements AfterViewInit {
  sidebarOpen = false;

  constructor(
    public auth: AuthService,
    public perms: PermissionService,
    private router: Router,
    private notificationService: NotificationService,
    private motion: MotionService,
    private theme: ThemeService
  ) {}

  ngAfterViewInit(): void {
    this.theme.init('admin');
    setTimeout(() => this.motion.initScrollReveal(), 80);
  }

  isStaff(profile: UserProfile): boolean {
    return ['admin', 'superadmin', 'subadmin'].includes(profile.role);
  }

  openNotifications(): void {
    this.closeSidebar();
    this.notificationService.requestOpenPanel();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  goToSite() {
    this.router.navigate(['/']);
  }

  async logout() {
    await this.auth.signOut();
  }
}
