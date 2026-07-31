import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <nav class="admin-pagination" *ngIf="totalRecords > 0" aria-label="Pagination">
      <div class="admin-pagination-info">
        <span class="admin-pagination-count">
          Showing {{ startIndex }}–{{ endIndex }} of {{ totalRecords }} {{ label }}
        </span>
        <label class="admin-page-size-label">
          <span class="admin-sr-only">Page size</span>
          <select
            [(ngModel)]="pageSizeModel"
            (ngModelChange)="onPageSizeChange($event)"
            class="admin-page-size-select"
            aria-label="Page size">
            <option *ngFor="let size of pageSizeOptions" [ngValue]="size">{{ size }}</option>
          </select>
        </label>
      </div>
      <div class="admin-pagination-controls" *ngIf="totalPages > 1">
        <button
          type="button"
          class="admin-pagination-btn"
          [disabled]="currentPage <= 1"
          (click)="pageChange.emit(1)"
          title="First page"
          aria-label="First page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="11 17 6 12 11 7"></polyline>
            <polyline points="18 17 13 12 18 7"></polyline>
          </svg>
        </button>
        <button
          type="button"
          class="admin-pagination-btn"
          [disabled]="currentPage <= 1"
          (click)="pageChange.emit(currentPage - 1)"
          title="Previous page"
          aria-label="Previous page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <ng-container *ngFor="let page of pageNumbers">
          <button
            *ngIf="typeof page === 'number'"
            type="button"
            class="admin-pagination-btn"
            [class.active]="page === currentPage"
            (click)="pageChange.emit(page)"
            [attr.aria-current]="page === currentPage ? 'page' : null"
            [title]="'Go to page ' + page">
            {{ page }}
          </button>
          <span *ngIf="page === '...'" class="admin-page-ellipsis" aria-hidden="true">…</span>
        </ng-container>
        <button
          type="button"
          class="admin-pagination-btn"
          [disabled]="currentPage >= totalPages"
          (click)="pageChange.emit(currentPage + 1)"
          title="Next page"
          aria-label="Next page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button
          type="button"
          class="admin-pagination-btn"
          [disabled]="currentPage >= totalPages"
          (click)="pageChange.emit(totalPages)"
          title="Last page"
          aria-label="Last page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="13 17 18 12 13 7"></polyline>
            <polyline points="6 17 11 12 6 7"></polyline>
          </svg>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    app-admin-pagination {
      display: block;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .admin-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .admin-page-size-label {
      display: inline-flex;
      align-items: center;
      margin: 0;
    }
  `]
})
export class AdminPaginationComponent implements OnChanges {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() totalRecords = 0;
  @Input() pageSize = 20;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];
  @Input() label = 'records';

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  pageSizeModel = 20;

  ngOnChanges() {
    this.pageSizeModel = this.pageSize;
  }

  get startIndex(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalRecords ? this.totalRecords : end;
  }

  get pageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else if (current <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...', total);
    } else if (current >= total - 2) {
      pages.push(1, '...');
      for (let i = total - 3; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  }

  onPageSizeChange(size: number) {
    this.pageSizeChange.emit(Number(size) || this.pageSize);
  }
}
