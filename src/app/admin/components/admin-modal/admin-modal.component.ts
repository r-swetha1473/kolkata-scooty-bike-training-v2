import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminOverlayService } from '../../services/admin-overlay.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';

@Component({
  selector: 'app-admin-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="admin-modal-backdrop"
      *ngIf="open"
      (click)="onBackdrop()"
      role="presentation">
      <div
        class="admin-modal-panel"
        [class.admin-modal-wide]="wide"
        [class.admin-modal-sm]="size === 'sm'"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        (click)="$event.stopPropagation()">
        <div class="admin-modal-header">
          <div class="admin-modal-titles">
            <h2 [id]="titleId">{{ title }}</h2>
            <p *ngIf="subtitle">{{ subtitle }}</p>
          </div>
          <button type="button" class="admin-modal-close" (click)="requestClose()" aria-label="Close">×</button>
        </div>
        <div class="admin-modal-body">
          <ng-content></ng-content>
        </div>
        <div class="admin-modal-footer" *ngIf="hasFooter">
          <ng-content select="[adminModalFooter]"></ng-content>
        </div>
      </div>
    </div>
  `
})
export class AdminModalComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() wide = false;
  @Input() size: 'default' | 'sm' = 'default';
  @Input() dirty = false;
  @Input() closeOnBackdrop = true;
  @Input() hasFooter = true;

  @Output() closed = new EventEmitter<void>();

  readonly titleId = `admin-modal-title-${Math.random().toString(36).slice(2, 9)}`;
  private wasOpen = false;
  private needsFocus = false;
  private escClose = () => void this.requestClose();

  constructor(
    private overlay: AdminOverlayService,
    private confirm: ConfirmDialogService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['open']) return;
    if (this.open && !this.wasOpen) {
      this.overlay.lockScroll(this.escClose);
      this.needsFocus = true;
      this.wasOpen = true;
    } else if (!this.open && this.wasOpen) {
      this.overlay.unlockScroll(this.escClose);
      this.wasOpen = false;
    }
  }

  ngAfterViewChecked() {
    if (!this.needsFocus || !this.open) return;
    this.needsFocus = false;
    const root = this.host.nativeElement.querySelector('.admin-modal-panel') as HTMLElement | null;
    if (!root) return;
    const focusable = root.querySelector(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not(.admin-modal-close)'
    ) as HTMLElement | null;
    (focusable || root.querySelector('.admin-modal-close') as HTMLElement | null)?.focus();
  }

  ngOnDestroy() {
    if (this.wasOpen) this.overlay.unlockScroll(this.escClose);
  }

  onBackdrop() {
    if (this.closeOnBackdrop) void this.requestClose();
  }

  async requestClose() {
    if (this.dirty) {
      const ok = await this.confirm.confirm({
        title: 'Discard changes?',
        message: 'You have unsaved changes. Close without saving?',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        variant: 'warning'
      });
      if (!ok) return;
    }
    this.closed.emit();
  }
}
