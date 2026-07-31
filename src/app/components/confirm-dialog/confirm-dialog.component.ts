import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConfirmDialogService, ConfirmDialogConfig } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" *ngIf="visible" (click)="onCancel()">
      <div
        class="dialog-card"
        [class]="'variant-' + (config?.variant || 'warning')"
        role="dialog"
        aria-modal="true"
        (click)="$event.stopPropagation()">
        <div class="dialog-icon" *ngIf="config?.variant === 'danger'">!</div>
        <div class="dialog-icon success" *ngIf="config?.variant === 'success'">✓</div>
        <div class="dialog-icon info" *ngIf="config?.variant === 'info'">i</div>
        <div class="dialog-icon" *ngIf="!config?.variant || config?.variant === 'warning'">?</div>
        <h3 class="dialog-title">{{ config?.title }}</h3>
        <p class="dialog-message">{{ config?.message }}</p>
        <div class="dialog-actions">
          <button type="button" class="btn-cancel" (click)="onCancel()">
            {{ config?.cancelLabel || 'Cancel' }}
          </button>
          <button
            type="button"
            class="btn-confirm"
            [class.danger]="config?.variant === 'danger'"
            (click)="onConfirm()">
            {{ config?.confirmLabel || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog-overlay {
        position: fixed;
        inset: 0;
        background: var(--color-overlay);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: var(--space-4);
        animation: ds-fade-in 0.2s ease;
      }
      .dialog-card {
        background: var(--color-card);
        border-radius: var(--radius-lg);
        padding: var(--space-6);
        width: min(420px, 100%);
        box-shadow: var(--shadow-xl);
        text-align: center;
        animation: ds-scale-in 0.2s var(--ease-out);
      }
      .dialog-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(245, 158, 11, 0.12);
        color: var(--color-warning);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        font-weight: 700;
        margin: 0 auto var(--space-4);
      }
      .dialog-icon.success {
        background: rgba(34, 197, 94, 0.12);
        color: var(--color-success);
      }
      .dialog-icon.info {
        background: rgba(37, 99, 235, 0.12);
        color: var(--color-primary);
      }
      .variant-danger .dialog-icon {
        background: rgba(239, 68, 68, 0.12);
        color: var(--color-danger);
      }
      .dialog-title {
        margin: 0 0 var(--space-2);
        font-size: var(--text-body-lg);
        font-weight: 600;
        color: var(--color-ink);
      }
      .dialog-message {
        margin: 0 0 var(--space-6);
        color: var(--color-muted);
        font-size: var(--text-body-sm);
        line-height: var(--leading-relaxed);
      }
      .dialog-actions {
        display: flex;
        gap: var(--space-3);
        justify-content: center;
      }
      .btn-cancel {
        flex: 1;
        min-height: 44px;
        padding: 0 var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-card);
        color: var(--color-ink-soft);
        font-weight: 600;
        font-size: var(--text-body-sm);
        cursor: pointer;
        transition: background var(--dur-fast);
      }
      .btn-cancel:hover { background: var(--color-bg); }
      .btn-confirm {
        flex: 1;
        min-height: 44px;
        padding: 0 var(--space-4);
        border: none;
        border-radius: var(--radius-md);
        background: var(--color-primary);
        color: #fff;
        font-weight: 600;
        font-size: var(--text-body-sm);
        cursor: pointer;
        transition: background var(--dur-fast);
      }
      .btn-confirm:hover { background: var(--color-primary-hover); }
      .btn-confirm.danger {
        background: var(--color-danger);
      }
      .btn-confirm.danger:hover {
        background: #DC2626;
      }
      @media (max-width: 480px) {
        .dialog-actions {
          flex-direction: column-reverse;
        }
        .dialog-actions button {
          width: 100%;
        }
      }
    `
  ]
})
export class ConfirmDialogComponent implements OnDestroy {
  visible = false;
  config: ConfirmDialogConfig | null = null;
  private stateSub: Subscription;

  constructor(private dialog: ConfirmDialogService) {
    this.stateSub = this.dialog.state$.subscribe((state) => {
      this.visible = state.visible;
      this.config = state.config;
    });
  }

  ngOnDestroy(): void {
    this.stateSub.unsubscribe();
  }

  onConfirm(): void {
    this.dialog.accept();
  }

  onCancel(): void {
    this.dialog.dismiss();
  }
}
