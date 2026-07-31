import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Branch, BranchService } from '../../../services/branch.service';
import {
  BranchScheduleContext,
  ScheduleService,
  ScheduleTimelineResponse,
  ScheduleWindow
} from '../../../services/schedule.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { environment } from '../../../../environments/environment';
import { addDays, formatTimeToAMPM, getKolkataToday, normalizeDate } from '../../../utils/date.utils';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';

type CalendarView = 'month' | 'week' | 'day';
type SlotTone = 'past' | 'available' | 'partial' | 'full' | 'disabled' | 'holiday';

interface DaySummary {
  date: string;
  weekday: string;
  label: string;
  closed: boolean;
  closedReason?: string | null;
  bookingsCount: number;
  availableCount: number;
  fullCount: number;
  tone: SlotTone;
}

interface MonthCell {
  date: string;
  day: number;
  inMonth: boolean;
  tone: SlotTone;
  bookingsCount: number;
  availableCount: number;
  isHoliday: boolean;
  summary: string;
}

const BRANCH_KEY = 'admin_schedule_branch_id';

@Component({
  selector: 'app-admin-slots',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminModalComponent, RouterModule],
  template: `
    <div class="slots-page admin-page schedule-calendar-page">
      <header class="admin-hero">
        <div>
          <h1>Schedule</h1>
          <p>Branch calendar powered by the scheduling engine.</p>
        </div>
        <div class="admin-hero-actions">
          <button type="button" class="admin-btn admin-btn-secondary" (click)="exportCsv()" [disabled]="!selectedBranchId || loading">Export day CSV</button>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="refresh()" [disabled]="loading">Refresh</button>
        </div>
      </header>

      <div class="branch-tabs" *ngIf="branches.length">
        <button
          type="button"
          class="branch-tab"
          *ngFor="let b of branches"
          [class.active]="selectedBranchId === b.id"
          (click)="selectBranch(b.id)">
          {{ b.name }}
        </button>
      </div>

      <div class="cal-toolbar" *ngIf="selectedBranchId">
        <div class="cal-toolbar-left">
          <div class="quick-actions">
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" [class.active-quick]="isTodayActive" (click)="goToday()">Today</button>
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" [class.active-quick]="isTomorrowActive" (click)="goTomorrow()">Tomorrow</button>
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" [class.active-quick]="view === 'week'" (click)="goThisWeek()">This Week</button>
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" [class.active-quick]="view === 'month'" (click)="goCalendar()">Calendar</button>
          </div>
          <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="navigate(-1)" title="Previous">‹</button>
          <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="navigate(1)" title="Next">›</button>
          <input type="date" class="admin-select" [(ngModel)]="selectedDate" (change)="onDatePicked()" />
          <strong class="cal-range-label">{{ rangeLabel }}</strong>
        </div>
        <div class="cal-toolbar-right" *ngIf="view === 'day'">
          <select class="admin-select" [(ngModel)]="vehicleFilter" (change)="reloadVisible()">
            <option value="">All vehicles</option>
            <option *ngFor="let v of branchContext?.vehicles || []" [value]="v.id">{{ v.name }}</option>
          </select>
          <select class="admin-select" [(ngModel)]="trainerFilter" (change)="reloadVisible()">
            <option value="">All trainers</option>
            <option *ngFor="let t of branchContext?.trainers || []" [value]="t.id">{{ t.full_name }}</option>
          </select>
          <select class="admin-select" [(ngModel)]="statusFilter" (change)="reloadVisible()">
            <option value="">All status</option>
            <option value="available">Available</option>
            <option value="full">Full</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4,5]"></div>
      </div>

      <div class="admin-empty-state" *ngIf="!loading && !selectedBranchId">
        <h3>Select a branch</h3>
        <p>Choose a branch tab to load the schedule calendar.</p>
      </div>

      <!-- MONTH -->
      <div class="month-grid" *ngIf="!loading && selectedBranchId && view === 'month'">
        <div class="month-head" *ngFor="let d of weekDayLabels">{{ d }}</div>
        <button
          type="button"
          class="month-cell"
          *ngFor="let cell of monthCells"
          [class.outside]="!cell.inMonth"
          [class.today]="cell.date === today"
          [class.holiday]="cell.isHoliday"
          (click)="openDay(cell.date)">
          <span class="day-num">{{ cell.day }}</span>
          <ng-container *ngIf="cell.inMonth">
            <span class="month-meta holiday-tag" *ngIf="cell.isHoliday">Holiday</span>
            <span class="month-meta" *ngIf="!cell.isHoliday && cell.summary">
              <span class="meta-bookings">{{ cell.bookingsCount }} booked</span>
              <span class="meta-available">{{ cell.availableCount }} open</span>
            </span>
            <span class="day-chip" [attr.data-tone]="cell.tone" *ngIf="cell.summary && !cell.isHoliday">{{ cell.summary }}</span>
          </ng-container>
        </button>
      </div>

      <!-- WEEK (summary cards) -->
      <div class="week-summary-grid" *ngIf="!loading && selectedBranchId && view === 'week'">
        <button
          type="button"
          class="week-summary-card"
          *ngFor="let day of weekSummaries"
          [attr.data-tone]="day.tone"
          [class.today]="day.date === today"
          (click)="openDay(day.date)">
          <div class="week-summary-head">
            <strong>{{ day.weekday }}</strong>
            <span>{{ day.label }}</span>
          </div>
          <div class="week-summary-body" *ngIf="!day.closed">
            <div class="summary-stat"><em>Bookings</em> {{ day.bookingsCount }}</div>
            <div class="summary-stat"><em>Available</em> {{ day.availableCount }}</div>
            <div class="summary-stat"><em>Full</em> {{ day.fullCount }}</div>
          </div>
          <div class="week-summary-closed" *ngIf="day.closed">
            {{ day.closedReason || 'Holiday / Closed' }}
          </div>
        </button>
      </div>

      <!-- DAY -->
      <div class="day-list" *ngIf="!loading && selectedBranchId && view === 'day'">
        <div class="branch-context-bar" *ngIf="branchContext">
          <span><strong>Duration:</strong> {{ branchContext.slot_duration_minutes }} min</span>
          <span><strong>Capacity:</strong> {{ branchContext.computed_capacity || branchContext.default_capacity }}</span>
          <span *ngIf="branchContext.is_closed" class="admin-badge admin-badge-info">{{ branchContext.closed_reason || 'Closed / Holiday' }}</span>
        </div>
        <div class="admin-empty-state" *ngIf="!daySlots.length">
          <h3>No schedule windows</h3>
          <p>{{ branchContext?.is_closed ? (branchContext.closed_reason || 'Branch closed') : 'No windows for this day.' }}</p>
        </div>
        <div class="day-cards" *ngIf="daySlots.length">
          <button
            type="button"
            class="slot-card day-card"
            *ngFor="let row of daySlots"
            [attr.data-tone]="slotTone(row)"
            (click)="openManage(row, selectedDate)">
            <div class="slot-card-head">
              <div class="slot-time">
                <svg class="slot-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 7v5l3 2"></path>
                </svg>
                {{ formatTime(row.start_time) }} – {{ formatTime(row.end_time) }}
              </div>
              <span class="slot-status">{{ statusLabel(row) }}</span>
            </div>
            <div class="slot-row">
              <svg class="slot-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span class="slot-label">Trainer</span>
              <span class="slot-value">{{ row.trainer_name || 'Unassigned' }}</span>
            </div>
            <div class="slot-row">
              <svg class="slot-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="7" cy="17" r="2"></circle>
                <circle cx="17" cy="17" r="2"></circle>
                <path d="M5 17H3v-5l2-4h9l3 4h2v5h-2"></path>
              </svg>
              <span class="slot-label">Vehicle</span>
              <span class="slot-value">{{ vehicleLine(row) }}</span>
            </div>
            <div class="slot-stats day-stats">
              <span><em>Capacity</em> {{ row.capacity }}</span>
              <span><em>Booked</em> {{ row.booked_count }}</span>
              <span><em>Remaining</em> {{ row.remaining_capacity }}</span>
              <span><em>Status</em> {{ statusLabel(row) }}</span>
            </div>
          </button>
        </div>
      </div>

      <app-admin-modal
        #manageModal
        [open]="manageOpen && !!activeWindow"
        title="Manage window"
        [subtitle]="activeWindow ? (formatTime(activeWindow.start_time) + ' – ' + formatTime(activeWindow.end_time)) : ''"
        [dirty]="false"
        (closed)="closeManage()">
        <ng-container *ngIf="activeWindow">
          <div class="detail-grid">
            <div><label>Status</label><strong>{{ activeWindow.status }}</strong></div>
            <div><label>Capacity</label><strong>{{ activeWindow.booked_count }}/{{ activeWindow.capacity }}</strong></div>
            <div><label>Remaining</label><strong>{{ activeWindow.remaining_capacity }}</strong></div>
            <div><label>Vehicles</label><span>{{ vehicleLine(activeWindow) }}</span></div>
          </div>
          <div class="form-group">
            <label>Trainer</label>
            <select class="admin-select" [(ngModel)]="manageForm.trainer_id">
              <option value="">Unassigned</option>
              <option *ngFor="let t of branchContext?.trainers || []" [value]="t.id">{{ t.full_name }}</option>
            </select>
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="saveTrainer()" [disabled]="actionSaving">Assign trainer</button>
          </div>
          <div class="form-group">
            <label>Override capacity</label>
            <input type="number" class="admin-input" [(ngModel)]="manageForm.capacity" min="0" />
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="saveCapacity()" [disabled]="actionSaving">Save capacity</button>
          </div>
          <div class="form-group">
            <label>Notes / disable reason</label>
            <input type="text" class="admin-input" [(ngModel)]="manageForm.notes" />
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="saveNotes()" [disabled]="actionSaving || !manageForm.notes.trim()">Save notes</button>
          </div>
          <div class="admin-action-group">
            <button type="button" class="admin-btn admin-btn-secondary" (click)="toggleEnable()" [disabled]="actionSaving">
              {{ activeWindow.status === 'disabled' ? 'Enable slot' : 'Disable slot' }}
            </button>
            <a class="admin-btn admin-btn-primary" [routerLink]="['/admin/bookings']" [queryParams]="bookingsQuery">View bookings</a>
          </div>
        </ng-container>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="manageModal.requestClose()">Close</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .branch-tabs { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.75rem; }
    .branch-tab {
      border: 1px solid var(--color-border); background: var(--color-card); border-radius: 999px;
      padding: 0.35rem 0.85rem; cursor: pointer; font-size: 0.8125rem;
    }
    .branch-tab.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
    .cal-toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; margin-bottom: 1rem; }
    .cal-toolbar-left, .cal-toolbar-right { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .quick-actions { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; }
    .quick-actions .active-quick {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
    }
    .cal-range-label { font-size: 0.9375rem; }
    .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.35rem; }
    .month-head { text-align: center; font-size: 0.75rem; color: var(--color-muted); font-weight: 600; padding: 0.25rem; }
    .month-cell {
      min-height: 84px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card);
      text-align: left; padding: 0.4rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.2rem;
    }
    .month-cell.outside { opacity: 0.45; }
    .month-cell.today { outline: 2px solid var(--color-primary); }
    .month-cell.holiday { background: rgba(37, 99, 235, 0.08); }
    .day-num { font-weight: 650; font-size: 0.8125rem; }
    .month-meta { display: flex; flex-direction: column; gap: 0.1rem; font-size: 0.625rem; color: #64748b; }
    .month-meta.holiday-tag { color: #1d4ed8; font-weight: 700; }
    .meta-bookings { color: #b45309; }
    .meta-available { color: #15803d; }
    .day-chip { font-size: 0.6875rem; border-radius: 999px; padding: 0.1rem 0.4rem; align-self: flex-start; }
    .day-chip[data-tone="available"] { background: rgba(22,163,74,.12); color: #15803d; }
    .day-chip[data-tone="partial"] { background: rgba(217,119,6,.12); color: #b45309; }
    .day-chip[data-tone="full"] { background: rgba(220,38,38,.12); color: #b91c1c; }
    .day-chip[data-tone="disabled"] { background: rgba(100,116,139,.15); color: #475569; }
    .day-chip[data-tone="holiday"] { background: rgba(37,99,235,.12); color: #1d4ed8; }
    .day-chip[data-tone="past"] { background: rgba(100,116,139,.15); color: #475569; }
    .week-summary-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(140px, 1fr));
      gap: 0.65rem;
      overflow-x: auto;
    }
    .week-summary-card {
      border: 1px solid var(--color-border);
      border-left-width: 4px;
      border-radius: 12px;
      background: #fff;
      padding: 0.85rem 0.75rem;
      text-align: left;
      cursor: pointer;
      min-height: 150px;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .week-summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
    }
    .week-summary-card.today { outline: 2px solid var(--color-primary); }
    .week-summary-card[data-tone="available"] { border-left-color: #16a34a; background: linear-gradient(180deg, #f0fdf4 0%, #fff 55%); }
    .week-summary-card[data-tone="partial"] { border-left-color: #d97706; background: linear-gradient(180deg, #fffbeb 0%, #fff 55%); }
    .week-summary-card[data-tone="full"] { border-left-color: #dc2626; background: linear-gradient(180deg, #fef2f2 0%, #fff 55%); }
    .week-summary-card[data-tone="holiday"] { border-left-color: #2563eb; background: linear-gradient(180deg, #eff6ff 0%, #fff 55%); }
    .week-summary-card[data-tone="disabled"],
    .week-summary-card[data-tone="past"] { border-left-color: #94a3b8; background: linear-gradient(180deg, #f8fafc 0%, #fff 55%); }
    .week-summary-head { display: flex; flex-direction: column; gap: 0.15rem; }
    .week-summary-head strong { font-size: 0.9375rem; color: #0f172a; }
    .week-summary-head span { font-size: 0.75rem; color: #64748b; }
    .week-summary-body { display: flex; flex-direction: column; gap: 0.35rem; margin-top: auto; }
    .summary-stat { font-size: 0.8125rem; color: #334155; }
    .summary-stat em { font-style: normal; font-weight: 700; color: #64748b; margin-right: 0.35rem; }
    .week-summary-closed {
      margin-top: auto;
      font-size: 0.8125rem;
      font-weight: 650;
      color: #1d4ed8;
    }
    .slot-card {
      border: 1px solid var(--color-border);
      border-left-width: 4px;
      border-radius: 10px;
      background: #fff;
      padding: 0.55rem 0.65rem;
      text-align: left;
      cursor: pointer;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.28rem;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .slot-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
    }
    .slot-card[data-tone="available"] { border-left-color: #16a34a; background: linear-gradient(180deg, #f0fdf4 0%, #fff 48%); }
    .slot-card[data-tone="partial"] { border-left-color: #d97706; background: linear-gradient(180deg, #fffbeb 0%, #fff 48%); }
    .slot-card[data-tone="full"] { border-left-color: #dc2626; background: linear-gradient(180deg, #fef2f2 0%, #fff 48%); }
    .slot-card[data-tone="past"],
    .slot-card[data-tone="disabled"] { border-left-color: #94a3b8; background: linear-gradient(180deg, #f8fafc 0%, #fff 48%); color: #64748b; }
    .slot-card[data-tone="holiday"] { border-left-color: #2563eb; background: linear-gradient(180deg, #eff6ff 0%, #fff 48%); }
    .slot-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.4rem; }
    .slot-time {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-weight: 700;
      font-size: 0.8125rem;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .day-card .slot-time { font-size: 0.9375rem; }
    .slot-status {
      flex-shrink: 0;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 0.15rem 0.4rem;
      border-radius: 999px;
      background: rgba(100, 116, 139, 0.12);
      color: #475569;
    }
    .slot-card[data-tone="available"] .slot-status { background: rgba(22, 163, 74, 0.12); color: #15803d; }
    .slot-card[data-tone="partial"] .slot-status { background: rgba(217, 119, 6, 0.14); color: #b45309; }
    .slot-card[data-tone="full"] .slot-status { background: rgba(220, 38, 38, 0.12); color: #b91c1c; }
    .slot-card[data-tone="holiday"] .slot-status { background: rgba(37, 99, 235, 0.12); color: #1d4ed8; }
    .slot-row {
      display: grid;
      grid-template-columns: 14px auto 1fr;
      gap: 0.35rem;
      align-items: baseline;
      font-size: 0.8125rem;
      line-height: 1.35;
    }
    .slot-ico { color: #94a3b8; flex-shrink: 0; align-self: center; }
    .slot-label { color: #64748b; font-weight: 600; }
    .slot-value { color: #334155; overflow-wrap: anywhere; }
    .slot-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 0.85rem;
      margin-top: 0.15rem;
      padding-top: 0.3rem;
      border-top: 1px solid rgba(148, 163, 184, 0.25);
      font-size: 0.75rem;
      color: #475569;
    }
    .slot-stats em { font-style: normal; font-weight: 700; color: #64748b; margin-right: 0.15rem; }
    .day-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.85rem; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
    .detail-grid label { display: block; font-size: 0.75rem; color: var(--color-muted); }
    .branch-context-bar { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 0.75rem; font-size: 0.875rem; }
    .form-group { margin-bottom: 0.85rem; display: grid; gap: 0.35rem; }
    @media (max-width: 900px) {
      .week-summary-grid { grid-template-columns: repeat(7, minmax(160px, 1fr)); }
      .month-cell { min-height: 68px; }
    }
  `]
})
export class AdminSlotsComponent implements OnInit, OnDestroy {
  loading = false;
  actionSaving = false;
  branches: Branch[] = [];
  selectedBranchId = '';
  selectedDate = getKolkataToday();
  today = getKolkataToday();
  view: CalendarView = 'day';
  vehicleFilter = '';
  trainerFilter = '';
  statusFilter = '';
  branchContext: BranchScheduleContext | null = null;
  daySlots: ScheduleWindow[] = [];
  weekSummaries: DaySummary[] = [];
  monthCells: MonthCell[] = [];
  weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  manageOpen = false;
  activeWindow: ScheduleWindow | null = null;
  activeWindowDate = '';
  manageForm = { trainer_id: '', capacity: 0, notes: '' };
  private eventSource?: EventSource;
  private dayCache = new Map<string, ScheduleTimelineResponse>();

  constructor(
    private scheduleService: ScheduleService,
    private branchService: BranchService,
    private toastService: ToastService
  ) {}

  get rangeLabel(): string {
    if (this.view === 'day') return this.formatReadable(this.selectedDate);
    if (this.view === 'week') {
      const start = this.weekStart(this.selectedDate);
      return `${this.formatReadable(start)} – ${this.formatReadable(addDays(start, 6))}`;
    }
    const [y, m] = this.selectedDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  get isTodayActive(): boolean {
    return this.view === 'day' && this.selectedDate === this.today;
  }

  get isTomorrowActive(): boolean {
    return this.view === 'day' && this.selectedDate === addDays(this.today, 1);
  }

  get bookingsQuery() {
    return {
      startDate: this.activeWindowDate || this.selectedDate,
      endDate: this.activeWindowDate || this.selectedDate,
      search: this.activeWindow?.start_time || ''
    };
  }

  async ngOnInit() {
    this.today = getKolkataToday();
    this.selectedDate = this.today;
    this.view = 'day';
    await this.loadBranches();
    this.subscribeToEvents();
  }

  ngOnDestroy() {
    this.eventSource?.close();
  }

  async loadBranches() {
    try {
      this.branches = await this.branchService.list(false);
      const saved = localStorage.getItem(BRANCH_KEY) || '';
      const match = this.branches.find((b) => b.id === saved);
      this.selectedBranchId = match?.id || this.branches[0]?.id || '';
      if (this.selectedBranchId) await this.reloadVisible();
    } catch {
      this.toastService.error('Failed to load branches');
    }
  }

  selectBranch(id: string) {
    this.selectedBranchId = id;
    localStorage.setItem(BRANCH_KEY, id);
    this.dayCache.clear();
    void this.reloadVisible();
  }

  goToday() {
    this.today = getKolkataToday();
    this.selectedDate = this.today;
    this.view = 'day';
    void this.reloadVisible();
  }

  goTomorrow() {
    this.today = getKolkataToday();
    this.selectedDate = addDays(this.today, 1);
    this.view = 'day';
    void this.reloadVisible();
  }

  goThisWeek() {
    this.today = getKolkataToday();
    this.selectedDate = this.today;
    this.view = 'week';
    void this.reloadVisible();
  }

  goCalendar() {
    this.view = 'month';
    void this.reloadVisible();
  }

  navigate(delta: number) {
    if (this.view === 'day') this.selectedDate = addDays(this.selectedDate, delta);
    else if (this.view === 'week') this.selectedDate = addDays(this.selectedDate, delta * 7);
    else {
      const [y, m] = this.selectedDate.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 + delta, 1));
      this.selectedDate = d.toISOString().slice(0, 10);
    }
    void this.reloadVisible();
  }

  onDatePicked() {
    this.selectedDate = normalizeDate(this.selectedDate) || getKolkataToday();
    if (this.view === 'month' || this.view === 'week') {
      // Keep current view; date picker anchors week/month around the chosen date.
      void this.reloadVisible();
      return;
    }
    this.view = 'day';
    void this.reloadVisible();
  }

  openDay(date: string) {
    this.selectedDate = date;
    this.view = 'day';
    void this.reloadVisible();
  }

  async refresh() {
    this.dayCache.clear();
    this.today = getKolkataToday();
    await this.reloadVisible();
  }

  async reloadVisible() {
    if (!this.selectedBranchId) return;
    this.loading = true;
    try {
      if (this.view === 'day') await this.loadDay(this.selectedDate);
      else if (this.view === 'week') await this.loadWeek();
      else await this.loadMonth();
    } catch (e) {
      this.toastService.error(getApiErrorMessage(e, 'Failed to load schedule'));
    } finally {
      this.loading = false;
    }
  }

  private async fetchDay(date: string, useFilters = true): Promise<ScheduleTimelineResponse> {
    const key = `${this.selectedBranchId}|${date}|${useFilters ? [this.vehicleFilter, this.trainerFilter, this.statusFilter].join('|') : 'raw'}`;
    if (this.dayCache.has(key)) return this.dayCache.get(key)!;
    const res = await this.scheduleService.getTimeline({
      branchId: this.selectedBranchId,
      date,
      vehicleId: useFilters ? this.vehicleFilter || undefined : undefined,
      trainerId: useFilters ? this.trainerFilter || undefined : undefined,
      status: useFilters ? this.statusFilter || undefined : undefined
    });
    this.dayCache.set(key, res);
    return res;
  }

  private async loadDay(date: string) {
    const res = await this.fetchDay(date, true);
    this.branchContext = res.branch_context;
    this.daySlots = res.slots || [];
  }

  private summarizeDay(date: string, res: ScheduleTimelineResponse | null): DaySummary {
    const ctx = res?.branch_context;
    const closed = !!ctx?.is_closed;
    const slots = res?.slots || [];
    const bookingsCount = slots.reduce((sum, s) => sum + (Number(s.booked_count) || 0), 0);
    const availableCount = slots.filter((s) => s.status === 'available' && s.remaining_capacity > 0).length;
    const fullCount = slots.filter((s) => s.status === 'full' || s.remaining_capacity <= 0).length;
    let tone: SlotTone = 'available';
    if (closed) tone = 'holiday';
    else if (!slots.length) tone = 'disabled';
    else if (fullCount === slots.length) tone = 'full';
    else if (bookingsCount > 0 || fullCount > 0) tone = 'partial';
    else tone = 'available';

    return {
      date,
      weekday: this.formatWeekday(date),
      label: this.formatShortDate(date),
      closed,
      closedReason: ctx?.closed_reason || (closed ? 'Holiday / Closed' : null),
      bookingsCount,
      availableCount,
      fullCount,
      tone
    };
  }

  private async loadWeek() {
    const start = this.weekStart(this.selectedDate);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const results = await Promise.all(dates.map((d) => this.fetchDay(d, false)));
    this.branchContext = results[0]?.branch_context || null;
    this.weekSummaries = dates.map((date, i) => this.summarizeDay(date, results[i]));
  }

  private async loadMonth() {
    const [y, m] = this.selectedDate.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const startPad = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const gridStart = addDays(first.toISOString().slice(0, 10), -startPad);
    const dates: string[] = [];
    for (let i = 0; i < 42; i++) dates.push(addDays(gridStart, i));

    // Load all in-month days in parallel (cached) for denser month summaries
    const inMonthDates = dates.filter((d) => Number(d.slice(5, 7)) === m);
    const sampleRes = await Promise.all(inMonthDates.map((d) => this.fetchDay(d, false).catch(() => null)));
    const byDate = new Map<string, ScheduleTimelineResponse>();
    inMonthDates.forEach((d, i) => {
      if (sampleRes[i]) byDate.set(d, sampleRes[i]!);
    });
    const firstHit = sampleRes.find(Boolean);
    if (firstHit) this.branchContext = firstHit.branch_context;

    const holidaySet = new Set(
      (this.branchContext?.holidays || []).map((h) => String(h.holiday_date).slice(0, 10))
    );

    this.monthCells = dates.map((date) => {
      const inMonth = Number(date.slice(5, 7)) === m;
      const day = Number(date.slice(8, 10));
      const res = byDate.get(date);
      const isHoliday = holidaySet.has(date) || !!res?.branch_context?.is_closed;
      let tone: SlotTone = 'available';
      let summary = '';
      let bookingsCount = 0;
      let availableCount = 0;

      if (!inMonth) {
        return { date, day, inMonth, tone: 'disabled', bookingsCount: 0, availableCount: 0, isHoliday: false, summary: '' };
      }

      if (isHoliday) {
        tone = 'holiday';
        summary = 'Holiday';
      } else if (res) {
        const slots = res.slots || [];
        bookingsCount = slots.reduce((sum, s) => sum + (Number(s.booked_count) || 0), 0);
        availableCount = slots.filter((s) => s.status === 'available' && s.remaining_capacity > 0).length;
        const full = slots.filter((s) => s.status === 'full' || s.remaining_capacity <= 0).length;
        const disabled = slots.filter((s) => s.status === 'disabled').length;
        if (!slots.length) {
          summary = '—';
          tone = 'disabled';
        } else {
          if (disabled === slots.length) tone = 'disabled';
          else if (full === slots.length) tone = 'full';
          else if (bookingsCount > 0 || full > 0) tone = 'partial';
          else tone = 'available';
          summary = `${availableCount} open · ${bookingsCount} booked`;
        }
      } else if (day === daysInMonth || day === 1) {
        summary = '·';
      }

      return { date, day, inMonth, tone, bookingsCount, availableCount, isHoliday, summary };
    });
  }

  slotTone(row: ScheduleWindow): SlotTone {
    if (this.branchContext?.is_closed) return 'holiday';
    if (this.isPastWindow(row)) return 'past';
    if (row.status === 'disabled') return 'disabled';
    if (row.status === 'full' || row.remaining_capacity <= 0) return 'full';
    if (row.booked_count > 0 && row.remaining_capacity > 0) return 'partial';
    return 'available';
  }

  statusLabel(row: ScheduleWindow): string {
    const tone = this.slotTone(row);
    if (tone === 'past') return 'Past';
    if (tone === 'holiday') return 'Holiday';
    if (tone === 'partial') return 'Partial';
    if (tone === 'full') return 'Full';
    if (tone === 'disabled') return 'Disabled';
    return 'Available';
  }

  /** True when window start is before now (ISO or date+time). Past wins over available. */
  isPastWindow(row: ScheduleWindow, dateHint?: string): boolean {
    const start = this.parseWindowStart(row, dateHint);
    if (!start) return false;
    return start.getTime() < Date.now();
  }

  private parseWindowStart(row: ScheduleWindow, dateHint?: string): Date | null {
    const raw = String(row?.start_time || '').trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}T/.test(raw) || /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:/.test(raw)) {
      const d = new Date(raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const dateStr = normalizeDate(row.slot_date || dateHint || this.selectedDate);
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split('-').map(Number);
      const hh = Number(timeMatch[1]);
      const mm = Number(timeMatch[2]);
      const ss = Number(timeMatch[3] || 0);
      const local = new Date(y, m - 1, d, hh, mm, ss, 0);
      return Number.isNaN(local.getTime()) ? null : local;
    }

    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  openManage(row: ScheduleWindow, date: string) {
    this.activeWindow = row;
    this.activeWindowDate = date;
    this.manageForm = {
      trainer_id: row.trainer_id || '',
      capacity: row.capacity,
      notes: row.reason || ''
    };
    this.manageOpen = true;
  }

  closeManage() {
    this.manageOpen = false;
    this.activeWindow = null;
    this.actionSaving = false;
  }

  private payload(row: ScheduleWindow, date: string) {
    return {
      branch_id: this.selectedBranchId,
      date,
      start_time: row.start_time,
      end_time: row.end_time
    };
  }

  async saveTrainer() {
    if (!this.activeWindow) return;
    this.actionSaving = true;
    try {
      await this.scheduleService.assignTrainer({
        ...this.payload(this.activeWindow, this.activeWindowDate),
        trainer_id: this.manageForm.trainer_id || null
      });
      this.toastService.success('Trainer assigned');
      this.dayCache.clear();
      await this.reloadVisible();
    } catch (e) {
      this.toastService.error(getApiErrorMessage(e, 'Failed to assign trainer'));
    } finally {
      this.actionSaving = false;
    }
  }

  async saveCapacity() {
    if (!this.activeWindow) return;
    this.actionSaving = true;
    try {
      await this.scheduleService.overrideCapacity({
        ...this.payload(this.activeWindow, this.activeWindowDate),
        capacity: Number(this.manageForm.capacity) || 0,
        reason: this.manageForm.notes?.trim() || undefined
      });
      this.toastService.success('Capacity updated');
      this.dayCache.clear();
      await this.reloadVisible();
    } catch (e) {
      this.toastService.error(getApiErrorMessage(e, 'Failed to update capacity'));
    } finally {
      this.actionSaving = false;
    }
  }

  async saveNotes() {
    if (!this.activeWindow || !this.manageForm.notes.trim()) return;
    this.actionSaving = true;
    try {
      await this.scheduleService.updateNotes({
        ...this.payload(this.activeWindow, this.activeWindowDate),
        reason: this.manageForm.notes.trim()
      });
      this.toastService.success('Notes saved');
      this.dayCache.clear();
      await this.reloadVisible();
    } catch (e) {
      this.toastService.error(getApiErrorMessage(e, 'Failed to save notes'));
    } finally {
      this.actionSaving = false;
    }
  }

  async toggleEnable() {
    if (!this.activeWindow) return;
    this.actionSaving = true;
    try {
      const p = this.payload(this.activeWindow, this.activeWindowDate);
      if (this.activeWindow.status === 'disabled') {
        await this.scheduleService.enableWindow(p);
        this.toastService.success('Slot enabled');
      } else {
        await this.scheduleService.disableWindow({
          ...p,
          reason: this.manageForm.notes.trim() || 'Disabled by admin'
        });
        this.toastService.success('Slot disabled');
      }
      this.dayCache.clear();
      await this.reloadVisible();
      this.closeManage();
    } catch (e) {
      this.toastService.error(getApiErrorMessage(e, 'Failed to update status'));
    } finally {
      this.actionSaving = false;
    }
  }

  async exportCsv() {
    if (!this.selectedBranchId) return;
    try {
      const blob = await this.scheduleService.exportCsv(this.selectedBranchId, this.selectedDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule_${this.selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toastService.error(getApiErrorMessage(e, 'Export failed'));
    }
  }

  formatTime(v: string) {
    return formatTimeToAMPM(v);
  }

  formatReadable(dateStr: string) {
    const n = normalizeDate(dateStr) || getKolkataToday();
    const [y, m, d] = n.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
    });
  }

  formatWeekday(dateStr: string) {
    const n = normalizeDate(dateStr) || getKolkataToday();
    const [y, m, d] = n.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
      weekday: 'long', timeZone: 'UTC'
    });
  }

  formatShortDate(dateStr: string) {
    const n = normalizeDate(dateStr) || getKolkataToday();
    const [y, m, d] = n.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', timeZone: 'UTC'
    });
  }

  vehicleLine(row: ScheduleWindow) {
    return (row.vehicle_capacities || []).map((v) => `${v.vehicle_name} ${v.booked}/${v.capacity}`).join(', ') || '—';
  }

  private weekStart(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return addDays(date, -dt.getUTCDay());
  }

  private subscribeToEvents() {
    try {
      const apiUrl = environment.apiUrl || 'http://localhost:3000/api';
      this.eventSource = new EventSource(`${apiUrl}/events`);
      this.eventSource.onmessage = async (ev) => {
        try {
          const payload = JSON.parse(ev.data || '{}');
          const evt = String(payload.event || '');
          if (!evt.startsWith('slot.') && !evt.startsWith('booking.')) return;
          this.dayCache.clear();
          if (this.selectedBranchId) await this.reloadVisible();
        } catch { /* ignore */ }
      };
    } catch { /* optional */ }
  }
}
