import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { redirectToCompleteProfile } from '../utils/phone-gate';

export const phoneRequiredInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const body = error?.error;
      const code =
        body && typeof body === 'object' ? body.code || body.errorCode : undefined;
      if (error.status === 428 && code === 'PHONE_REQUIRED') {
        redirectToCompleteProfile(router, router.url || '/booking');
      }
      return throwError(() => error);
    })
  );
};
