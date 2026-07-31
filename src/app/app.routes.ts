import { Routes } from '@angular/router';
import { authGuard, adminGuard, activeCustomerGuard, superAdminGuard, passwordChangeRequiredGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';
import { loadWithRetry } from './utils/route-loaders';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/home/home.component').then((m) => m.HomeComponent))
  },
  {
    path: 'about',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/about/about.component').then((m) => m.AboutComponent))
  },
  {
    path: 'courses',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/courses/courses.component').then((m) => m.CoursesComponent))
  },
  {
    path: 'trainers',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/trainers/trainers.component').then((m) => m.TrainersComponent))
  },
  {
    path: 'contact',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/contact/contact.component').then((m) => m.ContactComponent))
  },
  {
    path: 'terms',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/legal/legal-page.component').then((m) => m.LegalPageComponent)),
    data: { page: 'terms' }
  },
  {
    path: 'privacy',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/legal/legal-page.component').then((m) => m.LegalPageComponent)),
    data: { page: 'privacy' }
  },
  {
    path: 'cookies',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/legal/legal-page.component').then((m) => m.LegalPageComponent)),
    data: { page: 'cookies' }
  },
  {
    path: 'refund-policy',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/legal/legal-page.component').then((m) => m.LegalPageComponent)),
    data: { page: 'refund-policy' }
  },
  {
    path: 'cancellation-policy',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/legal/legal-page.component').then((m) => m.LegalPageComponent)),
    data: { page: 'cancellation-policy' }
  },
  {
    path: 'faq',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/faq/faq.component').then((m) => m.FaqPageComponent))
  },
  {
    path: 'pricing',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/pricing/pricing.component').then((m) => m.PricingPageComponent))
  },
  {
    path: 'branches',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/branches/branches.component').then((m) => m.BranchesPageComponent))
  },
  {
    path: 'branches/:slug',
    loadComponent: () =>
      loadWithRetry(() =>
        import('./pages/branch-detail/branch-detail.component').then((m) => m.BranchDetailComponent)
      )
  },
  {
    path: 'gallery',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/gallery/gallery.component').then((m) => m.GalleryPageComponent))
  },
  {
    path: 'blogs',
    loadComponent: () =>
      loadWithRetry(() => import('./pages/blogs/blogs.component').then((m) => m.BlogsPageComponent))
  },
  {
    path: 'blogs/:slug',
    loadComponent: () =>
      loadWithRetry(() =>
        import('./pages/blog-detail/blog-detail.component').then((m) => m.BlogDetailComponent)
      )
  },
  {
    path: 'courses/:slug',
    loadComponent: () =>
      loadWithRetry(() =>
        import('./pages/course-detail/course-detail.component').then((m) => m.CourseDetailComponent)
      )
  },
  {
    path: 'booking',
    canActivate: [activeCustomerGuard],
    loadComponent: () =>
      loadWithRetry(() => import('./pages/booking/booking.component').then((m) => m.BookingComponent))
  },
  {
    path: 'account',
    canActivate: [authGuard, activeCustomerGuard],
    loadComponent: () =>
      loadWithRetry(() =>
        import('./pages/customer-dashboard/customer-dashboard.component').then(
          (m) => m.CustomerDashboardComponent
        )
      )
  },
  {
    path: 'my-payments',
    canActivate: [authGuard, activeCustomerGuard],
    loadComponent: () =>
      loadWithRetry(() =>
        import('./pages/my-payments/my-payments.component').then((m) => m.MyPaymentsComponent)
      )
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      loadWithRetry(() => import('./pages/profile/profile.component').then((m) => m.ProfileComponent))
  },
  {
    path: 'my-bookings',
    canActivate: [authGuard],
    loadComponent: () =>
      loadWithRetry(() => import('./pages/my-bookings/my-bookings.component').then((m) => m.MyBookingsComponent))
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      loadWithRetry(() =>
        import('./pages/admin-login/admin-login.component').then((m) => m.AdminLoginComponent)
      )
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      loadWithRetry(() =>
        import('./admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent)
      ),
    children: [
      {
        path: 'change-password',
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/change-password/change-password.component').then(
              (m) => m.AdminChangePasswordComponent
            )
          )
      },
      {
        path: '',
        canActivate: [permissionGuard('dashboard', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/dashboard/dashboard.component').then((m) => m.AdminDashboardComponent)
          )
      },
      {
        path: 'bookings',
        canActivate: [permissionGuard('bookings', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/bookings/bookings.component').then((m) => m.AdminBookingsComponent)
          )
      },
      {
        path: 'offline-bookings',
        canActivate: [permissionGuard('bookings', 'create'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/offline-bookings/offline-bookings.component').then(
              (m) => m.AdminOfflineBookingsComponent
            )
          )
      },
      {
        path: 'slots',
        canActivate: [permissionGuard('slots', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/slots/slots.component').then((m) => m.AdminSlotsComponent)
          )
      },
      {
        path: 'trainers',
        canActivate: [permissionGuard('trainers', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/trainers/trainers.component').then((m) => m.AdminTrainersComponent)
          )
      },
      {
        path: 'users',
        canActivate: [permissionGuard('users', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/users/users.component').then((m) => m.AdminUsersComponent)
          )
      },
      {
        path: 'reactivation-requests',
        canActivate: [permissionGuard('users', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/reactivation-requests/reactivation-requests.component').then(
              (m) => m.AdminReactivationRequestsComponent
            )
          )
      },
      {
        path: 'vehicles',
        canActivate: [permissionGuard('vehicles', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/vehicles/vehicles.component').then((m) => m.AdminVehiclesComponent)
          )
      },
      {
        path: 'branches',
        canActivate: [permissionGuard('branches', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/branches/branches.component').then((m) => m.AdminBranchesComponent)
          )
      },
      {
        path: 'payments',
        canActivate: [permissionGuard('payments', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/payments/payments.component').then((m) => m.AdminPaymentsComponent)
          )
      },
      {
        path: 'reports',
        canActivate: [permissionGuard('dashboard', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/reports/reports.component').then((m) => m.AdminReportsComponent)
          )
      },
      {
        path: 'scheduling-health',
        canActivate: [permissionGuard('dashboard', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/scheduling-health/scheduling-health.component').then(
              (m) => m.AdminSchedulingHealthComponent
            )
          )
      },
      {
        path: 'courses',
        canActivate: [permissionGuard('settings', 'edit'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/courses/courses.component').then((m) => m.AdminCoursesComponent)
          )
      },
      {
        path: 'gallery',
        canActivate: [permissionGuard('gallery', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/gallery/gallery.component').then((m) => m.AdminGalleryComponent)
          )
      },
      {
        path: 'testimonials',
        canActivate: [permissionGuard('testimonials', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/testimonials/testimonials.component').then(
              (m) => m.AdminTestimonialsComponent
            )
          )
      },
      {
        path: 'blogs',
        canActivate: [permissionGuard('blogs', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/blogs/blogs.component').then((m) => m.AdminBlogsComponent)
          )
      },
      {
        path: 'coupons',
        canActivate: [permissionGuard('coupons', 'view'), passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/coupons/coupons.component').then((m) => m.AdminCouponsComponent)
          )
      },
      {
        path: 'sub-admins',
        canActivate: [superAdminGuard, passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/sub-admins/sub-admins.component').then((m) => m.AdminSubAdminsComponent)
          )
      },
      {
        path: 'settings',
        canActivate: [superAdminGuard, passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/settings/settings.component').then((m) => m.AdminSettingsComponent)
          )
      },
      {
        path: 'audit-logs',
        canActivate: [superAdminGuard, passwordChangeRequiredGuard],
        loadComponent: () =>
          loadWithRetry(() =>
            import('./admin/pages/audit-logs/audit-logs.component').then((m) => m.AdminAuditLogsComponent)
          )
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
