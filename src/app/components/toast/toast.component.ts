import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div *ngIf="toast" class="toast" [ngClass]="['toast-' + toast.type, show ? 'show' : '']" role="status" aria-live="polite">
      <span class="toast-icon" aria-hidden="true">
        <svg *ngIf="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <svg *ngIf="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <svg *ngIf="toast.type === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <svg *ngIf="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </span>
      <span class="toast-message">{{ toast.message }}</span>
      <button type="button" class="toast-close" (click)="close()" aria-label="Dismiss notification">×</button>
    </div>
  `
})
export class ToastComponent implements OnInit, OnDestroy {
  toast: ToastMessage | null = null;
  show = false;
  private subscription?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toast$.subscribe((toast) => {
      if (toast) {
        this.toast = toast;
        setTimeout(() => (this.show = true), 10);
      } else {
        this.show = false;
        setTimeout(() => (this.toast = null), 300);
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  close() {
    this.toastService.hide();
  }
}
