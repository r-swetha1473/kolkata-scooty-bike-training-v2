import { Injectable } from '@angular/core';
import { AuthService, ModulePermission, UserProfile } from './auth.service';

export type PermissionModule =
  | 'dashboard'
  | 'users'
  | 'trainers'
  | 'vehicles'
  | 'bookings'
  | 'slots'
  | 'branches'
  | 'payments'
  | 'audit_logs'
  | 'settings'
  | 'gallery'
  | 'testimonials'
  | 'blogs'
  | 'coupons';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  constructor(private auth: AuthService) {}

  can(module: PermissionModule, action: PermissionAction): boolean {
    const profile = this.auth.getUserProfile();
    if (!profile) return false;

    if (profile.role === 'superadmin') return true;

    if (profile.role === 'admin') {
      const matrix: Record<string, PermissionAction[]> = {
        dashboard: ['view'],
        users: ['view', 'edit'],
        bookings: ['view', 'create', 'edit', 'delete'],
        trainers: ['view', 'create', 'edit', 'delete'],
        vehicles: ['view', 'create', 'edit', 'delete'],
        slots: ['view', 'create', 'edit', 'delete'],
        branches: ['view', 'create', 'edit', 'delete'],
        payments: ['view', 'edit'],
        gallery: ['view', 'create', 'edit', 'delete'],
        testimonials: ['view', 'create', 'edit', 'delete'],
        blogs: ['view', 'create', 'edit', 'delete'],
        coupons: ['view', 'create', 'edit', 'delete'],
        settings: [],
        audit_logs: []
      };
      return (matrix[module] || []).includes(action);
    }

    if (profile.role === 'subadmin') {
      const perms = this.getModulePermission(profile, module);
      if (!perms) return false;
      if (action === 'view') return perms.can_view;
      if (action === 'create') return perms.can_create;
      if (action === 'edit') return perms.can_edit;
      if (action === 'delete') return perms.can_delete;
    }

    return false;
  }

  canViewModule(module: PermissionModule): boolean {
    return this.can(module, 'view');
  }

  /** First admin route the current user may access (for post-login redirect). */
  getFirstAllowedAdminRoute(): string {
    const order: { module: PermissionModule; path: string }[] = [
      { module: 'dashboard', path: '/admin' },
      { module: 'bookings', path: '/admin/bookings' },
      { module: 'users', path: '/admin/users' },
      { module: 'trainers', path: '/admin/trainers' },
      { module: 'vehicles', path: '/admin/vehicles' },
      { module: 'slots', path: '/admin/slots' },
      { module: 'branches', path: '/admin/branches' },
      { module: 'payments', path: '/admin/payments' },
      { module: 'gallery', path: '/admin/gallery' },
      { module: 'testimonials', path: '/admin/testimonials' },
      { module: 'blogs', path: '/admin/blogs' },
      { module: 'coupons', path: '/admin/coupons' },
      { module: 'settings', path: '/admin/settings' },
      { module: 'audit_logs', path: '/admin/audit-logs' }
    ];
    for (const item of order) {
      if (this.canViewModule(item.module)) {
        return item.path;
      }
    }
    return '/admin/login';
  }

  private getModulePermission(profile: UserProfile, module: PermissionModule): ModulePermission | undefined {
    return profile.permissions?.find((p) => p.module === module);
  }
}
