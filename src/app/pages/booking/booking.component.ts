import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Branch, BranchService } from '../../services/branch.service';
import { Course, CourseService } from '../../services/course.service';
import { CouponService, CouponValidateResult } from '../../services/coupon.service';
import { PaymentService } from '../../services/payment.service';
import { SeoService } from '../../services/seo.service';
import { SettingsService, BookingRulesSettings } from '../../services/settings.service';
import { Slot, SlotService } from '../../services/slot.service';
import { ToastService } from '../../services/toast.service';
import {
  addDays,
  extractTime,
  formatTimeToAMPM,
  getDayOfWeek,
  getKolkataToday,
  normalizeDate
} from '../../utils/date.utils';
import { getApiErrorMessage } from '../../utils/api-error';

type WizardStep = 'branch' | 'date' | 'slot' | 'details' | 'payment' | 'done';
type SlotPeriod = 'morning' | 'afternoon' | 'evening';
type SlotUiState = 'available' | 'booked' | 'past' | 'disabled' | 'selected';
/** Calendar / empty-state classification (frontend UX only). */
type DayBadge = 'available' | 'opens_later' | 'full' | 'holiday' | 'noschedule' | 'today_closed' | 'none';
type SlotPanelMode =
  | 'bookable_list'
  | 'today_closed'
  | 'opens_later'
  | 'fully_booked'
  | 'no_schedule'
  | 'holiday';

interface DayMeta {
  badge: DayBadge;
  bookableCount: number;
  hasSchedule: boolean;
  allFull: boolean;
  earliestStartIso: string | null;
}

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isSelected: boolean;
  isAvailable: boolean;
  badge: DayBadge;
  disabled: boolean;
  badgeLabel: string;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit, OnDestroy {
  /** Loaded from GET /settings/booking-rules */
  VISIBILITY_HOURS = 168;
  MIN_ADVANCE_HOURS = 5;
  allowSameDayBooking = true;
  showFullyBookedSlots = false;
  showSlotsOutsideWindow = true;
  slotVisibilityMode: BookingRulesSettings['slot_visibility_mode'] = 'hide_unavailable';
  holidayBookingAllowed = false;
  ADVANCE_UNAVAILABLE_TITLE =
    'Bookings must be made at least 5 hours in advance.';
  WINDOW_UNAVAILABLE_TITLE =
    'This slot is outside the advance booking window.';
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  step: WizardStep = 'branch';
  readonly steps: { id: WizardStep; label: string }[] = [
    { id: 'branch', label: 'Branch' },
    { id: 'date', label: 'Date' },
    { id: 'slot', label: 'Time' },
    { id: 'details', label: 'Details' },
    { id: 'payment', label: 'Payment' },
    { id: 'done', label: 'Done' }
  ];
  loading = false;
  courses: Course[] = [];
  branches: Branch[] = [];
  slots: Slot[] = [];
  selectedCourse: Course | null = null;
  /** Inline course switcher open state (Branch / Date / Time only). */
  coursePickerOpen = false;
  selectedBranch: Branch | null = null;
  selectedDate = getKolkataToday();
  selectedSlot: Slot | null = null;
  selectedVehicleId = '';
  phone = '';
  notes = '';
  couponCode = '';
  couponValidating = false;
  couponResult: CouponValidateResult | null = null;
  couponError = '';
  referenceNumber = '';
  receiptFile: File | null = null;
  uploadProgress = 0;
  paymentError = '';
  createdBooking: any = null;
  paymentId = '';
  minDate = getKolkataToday();
  pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Calendar view (0-based month) */
  calendarYear = Number(getKolkataToday().slice(0, 4));
  calendarMonth = Number(getKolkataToday().slice(5, 7)) - 1;
  /** Per-date probe results for badges + messaging */
  dayMeta = new Map<string, DayMeta>();
  probingMonth = false;
  private probeToken = 0;
  /** Raw slots from API; display list is filtered. */
  private rawSlots: Slot[] = [];

  get stepIndex(): number {
    return Math.max(0, this.steps.findIndex((s) => s.id === this.step));
  }

  get progressPercent(): number {
    if (this.step === 'done') return 100;
    return Math.round((this.stepIndex / (this.steps.length - 1)) * 100);
  }

  get calendarTitle(): string {
    const label = new Date(Date.UTC(this.calendarYear, this.calendarMonth, 1)).toLocaleString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
    return label;
  }

  get calendarDays(): CalendarDay[] {
    const today = getKolkataToday();
    const firstDow = getDayOfWeek(`${this.padYmd(this.calendarYear, this.calendarMonth + 1, 1)}`);
    const daysInMonth = this.daysInMonth(this.calendarYear, this.calendarMonth);
    const cells: CalendarDay[] = [];

    // Leading days from previous month
    const prevYear = this.calendarMonth === 0 ? this.calendarYear - 1 : this.calendarYear;
    const prevMonth = this.calendarMonth === 0 ? 11 : this.calendarMonth - 1;
    const prevDays = this.daysInMonth(prevYear, prevMonth);
    for (let i = firstDow - 1; i >= 0; i--) {
      const day = prevDays - i;
      const date = this.padYmd(prevYear, prevMonth + 1, day);
      cells.push(this.buildDay(date, day, false, today));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = this.padYmd(this.calendarYear, this.calendarMonth + 1, day);
      cells.push(this.buildDay(date, day, true, today));
    }

    // Trailing days to fill 6 weeks
    const nextYear = this.calendarMonth === 11 ? this.calendarYear + 1 : this.calendarYear;
    const nextMonth = this.calendarMonth === 11 ? 0 : this.calendarMonth + 1;
    let nextDay = 1;
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const date = this.padYmd(nextYear, nextMonth + 1, nextDay);
      cells.push(this.buildDay(date, nextDay, false, today));
      nextDay++;
      if (cells.length >= 42) break;
    }

    return cells;
  }

  get morningSlots(): Slot[] {
    return this.slotsInPeriod('morning');
  }

  get afternoonSlots(): Slot[] {
    return this.slotsInPeriod('afternoon');
  }

  get eveningSlots(): Slot[] {
    return this.slotsInPeriod('evening');
  }

  /** Slots shown in the time step (bookable only). */
  get displaySlots(): Slot[] {
    return this.slots;
  }

  get slotPanelMode(): SlotPanelMode {
    const today = getKolkataToday();
    const meta = this.analyzeSlots(this.rawSlots, this.selectedDate);

    if (!meta.hasSchedule) {
      // Empty day — treat as no schedule (holiday when Sunday + empty is a soft hint only)
      return this.isLikelyHoliday(this.selectedDate) ? 'holiday' : 'no_schedule';
    }
    if (meta.bookableCount > 0) return 'bookable_list';
    if (meta.allFull) return 'fully_booked';
    if (this.selectedDate === today) return 'today_closed';
    if (meta.badge === 'opens_later' || this.rawSlots.some((s) => this.isSlotOutsideBookingWindow(s))) {
      return 'opens_later';
    }
    return 'today_closed';
  }

  get bookingOpensAtLabel(): string | null {
    const earliest = this.dayMeta.get(this.selectedDate)?.earliestStartIso
      || this.analyzeSlots(this.rawSlots, this.selectedDate).earliestStartIso;
    if (!earliest) return null;
    const openAt = new Date(new Date(earliest).getTime() - this.VISIBILITY_HOURS * 60 * 60 * 1000);
    if (Number.isNaN(openAt.getTime())) return null;
    const datePart = openAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Asia/Kolkata'
    });
    const timePart = openAt.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    return `${datePart} at ${timePart}`;
  }

  get selectedDateLongLabel(): string {
    return this.formatDisplayDate(this.selectedDate);
  }

  constructor(
    private coursesApi: CourseService,
    private branchesApi: BranchService,
    private slotsApi: SlotService,
    private api: ApiService,
    private payments: PaymentService,
    private coupons: CouponService,
    private auth: AuthService,
    private toast: ToastService,
    private seo: SeoService,
    private settings: SettingsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    const courseSlug = this.route.snapshot.queryParamMap.get('course')?.trim() || '';

    this.seo.setPage({
      title: 'Book Training',
      description: 'Choose a branch, pick a slot, and complete manual payment for Kolkata scooty and bike training.',
      path: '/booking'
    });
    this.loading = true;
    try {
      await this.loadBookingRulesFromSettings();
      [this.courses, this.branches] = await Promise.all([
        this.coursesApi.list(true),
        this.branchesApi.list(true)
      ]);
      // Wizard always starts at Branch (no dedicated Course step).
      this.step = 'branch';
      const q = this.route.snapshot.queryParamMap;
      const branchSlug = q.get('branch');

      if (courseSlug) {
        // Explicit ?course=<slug> always wins over auto-default.
        this.selectedCourse = this.courses.find((c) => c.slug === courseSlug) || null;
        if (!this.selectedCourse) {
          this.toast.error(
            'We could not load that course. Please choose a course again.'
          );
          void this.router.navigate(['/courses']);
          return;
        }
      } else {
        // Bare /booking — default to cheapest active course; user can Change in-wizard.
        this.selectedCourse = this.pickCheapestCourse(this.courses);
        if (!this.selectedCourse) {
          this.toast.error('No courses are available to book right now.');
          void this.router.navigate(['/courses']);
          return;
        }
        this.syncCourseQueryParam(this.selectedCourse.slug);
      }

      if (branchSlug) {
        this.selectedBranch = this.branches.find((b) => b.slug === branchSlug) || null;
        if (this.selectedBranch) {
          this.step = 'date';
          this.syncCalendarToSelected();
          void this.probeMonthAvailability();
        }
      }
      const profile = await firstValueFrom(this.auth.userProfile$);
      if (profile?.phone && !String(profile.phone).startsWith('GOOGLE_')) {
        this.phone = String(profile.phone).replace(/\D/g, '').slice(-10);
      }
    } catch (e: any) {
      this.toast.error(e?.message || 'Failed to load booking options');
    } finally {
      this.loading = false;
    }
  }

  /** Change course on Branch / Date / Time; locked from Details onward (before hold). */
  get canChangeCourse(): boolean {
    return this.step === 'branch' || this.step === 'date' || this.step === 'slot';
  }

  /** Active courses sorted cheapest-first (for default + picker display). */
  get coursesByPriceAsc(): Course[] {
    return [...this.courses].sort(
      (a, b) => (Number(a.amount_inr) || 0) - (Number(b.amount_inr) || 0)
    );
  }

  private pickCheapestCourse(courses: Course[]): Course | null {
    if (!courses?.length) return null;
    return (
      [...courses].sort(
        (a, b) => (Number(a.amount_inr) || 0) - (Number(b.amount_inr) || 0)
      )[0] || null
    );
  }

  courseOptionLabel(c: Course): string {
    const price = c.price_label || (c.amount_inr != null ? `₹${c.amount_inr}` : '');
    return price ? `${c.name} (${price})` : c.name;
  }

  toggleCoursePicker() {
    if (!this.canChangeCourse) return;
    this.coursePickerOpen = !this.coursePickerOpen;
  }

  onCourseSelectId(id: string) {
    const course = this.courses.find((c) => c.id === id);
    if (course) this.selectCourse(course);
  }

  /**
   * Update selectedCourse + fee display. Slots/availability are branch+date based
   * (not course-scoped), so branch/date/slot are kept.
   */
  selectCourse(course: Course) {
    if (!this.canChangeCourse || !course) return;
    if (this.selectedCourse?.id === course.id) {
      this.coursePickerOpen = false;
      return;
    }
    this.selectedCourse = course;
    this.couponCode = '';
    this.couponResult = null;
    this.couponError = '';
    this.coursePickerOpen = false;
    this.syncCourseQueryParam(course.slug);
  }

  /** Keep ?course= in sync for OAuth return / share without dropping other params. */
  private syncCourseQueryParam(slug: string) {
    if (!slug) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { course: slug },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.probeToken++;
  }

  private parseSettingHours(raw: unknown, fallback: number): number {
    if (raw == null || raw === '') return fallback;
    let v: unknown = raw;
    if (typeof v === 'string') {
      try {
        v = JSON.parse(v);
      } catch {
        /* plain number string */
      }
    }
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  private parseBool(raw: unknown, fallback: boolean): boolean {
    if (typeof raw === 'boolean') return raw;
    if (raw === 'true' || raw === 1 || raw === '1') return true;
    if (raw === 'false' || raw === 0 || raw === '0') return false;
    return fallback;
  }

  private async loadBookingRulesFromSettings() {
    try {
      let rules: Partial<BookingRulesSettings> | null = null;
      try {
        rules = await this.settings.getBookingRules();
      } catch {
        await this.settings.loadSettings();
        rules = this.settings.getSettings() as any;
      }
      this.VISIBILITY_HOURS = this.parseSettingHours(rules?.booking_window_hours, 168);
      this.MIN_ADVANCE_HOURS = this.parseSettingHours(rules?.min_advance_hours, 5);
      this.allowSameDayBooking = this.parseBool(rules?.allow_same_day_booking, true);
      this.showFullyBookedSlots = this.parseBool(rules?.show_fully_booked_slots, false);
      this.showSlotsOutsideWindow = this.parseBool(rules?.show_slots_outside_window, true);
      this.holidayBookingAllowed = this.parseBool(rules?.holiday_booking_allowed, false);
      const mode = String(rules?.slot_visibility_mode || 'hide_unavailable');
      this.slotVisibilityMode =
        mode === 'disable_unavailable' || mode === 'show_all_with_status'
          ? mode
          : 'hide_unavailable';
      this.ADVANCE_UNAVAILABLE_TITLE = `Bookings must be made at least ${this.MIN_ADVANCE_HOURS} hours in advance.`;
      this.WINDOW_UNAVAILABLE_TITLE = this.bookingWindowLabel();
      this.minDate = this.allowSameDayBooking ? getKolkataToday() : addDays(getKolkataToday(), 1);
      if (!this.allowSameDayBooking && this.selectedDate === getKolkataToday()) {
        this.selectedDate = this.minDate;
      }
    } catch {
      this.VISIBILITY_HOURS = 168;
      this.MIN_ADVANCE_HOURS = 5;
    }
  }

  bookingWindowLabel(): string {
    const h = this.VISIBILITY_HOURS;
    if (h % 24 === 0) {
      const days = h / 24;
      return `Bookings open up to ${days} day${days === 1 ? '' : 's'} before the training session.`;
    }
    return `Bookings open up to ${h} hours before the training session.`;
  }

  selectBranch(b: Branch) {
    this.selectedBranch = b;
    this.selectedSlot = null;
    this.slots = [];
    this.rawSlots = [];
    this.dayMeta = new Map();
    this.syncCalendarToSelected();
    this.step = 'date';
    void this.probeMonthAvailability();
  }

  prevMonth() {
    if (this.calendarMonth === 0) {
      this.calendarMonth = 11;
      this.calendarYear -= 1;
    } else {
      this.calendarMonth -= 1;
    }
    void this.probeMonthAvailability();
  }

  nextMonth() {
    if (this.calendarMonth === 11) {
      this.calendarMonth = 0;
      this.calendarYear += 1;
    } else {
      this.calendarMonth += 1;
    }
    void this.probeMonthAvailability();
  }

  goToToday() {
    const today = getKolkataToday();
    this.calendarYear = Number(today.slice(0, 4));
    this.calendarMonth = Number(today.slice(5, 7)) - 1;
    void this.probeMonthAvailability();
  }

  async selectCalendarDate(day: CalendarDay) {
    // Past / out-of-month stay disabled. Future (incl. locked) is selectable for messaging.
    if (!day.inMonth || day.isPast) return;
    this.selectedDate = day.date;
    this.selectedSlot = null;
    await this.loadSlots();
  }

  async chooseTomorrow() {
    const tomorrow = addDays(getKolkataToday(), 1);
    this.selectedDate = tomorrow;
    this.syncCalendarToSelected();
    await this.loadSlots();
  }

  async loadSlots() {
    if (!this.selectedBranch || !this.selectedDate) return;
    this.loading = true;
    try {
      // Full day schedule for UX messaging; bookable filter applied client-side only.
      this.rawSlots = await this.slotsApi.getSlotsByDate(this.selectedDate, {
        bookableOnly: false,
        branchId: this.selectedBranch.id
      });
      const meta = this.analyzeSlots(this.rawSlots, this.selectedDate);
      const next = new Map(this.dayMeta);
      next.set(this.selectedDate, meta);
      this.dayMeta = next;

      // Time step list respects slot visibility mode + toggles.
      this.slots = this.rawSlots.filter((s) => this.shouldShowSlotInList(s));
      this.selectedSlot = null;
      this.step = 'slot';
    } catch (e: any) {
      this.toast.error(e?.error?.message || e?.message || 'Failed to load slots');
      this.rawSlots = [];
      this.slots = [];
    } finally {
      this.loading = false;
    }
  }

  isCurrentlyBookable(slot: Slot): boolean {
    if (this.isSlotPast(slot)) return false;
    if (this.isSlotStatusDisabled(slot)) return false;
    if (this.isSlotFull(slot)) return false;
    if (this.isSameDayBlocked(slot)) return false;
    if (this.isSlotAdvanceBlocked(slot)) return false;
    if (this.isSlotOutsideBookingWindow(slot)) return false;
    return true;
  }

  isSameDayBlocked(slot: Slot): boolean {
    if (this.allowSameDayBooking) return false;
    const today = getKolkataToday();
    const slotDate =
      (slot as any).slot_date ||
      new Date(slot.start_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return slotDate === today;
  }

  shouldShowSlotInList(slot: Slot): boolean {
    if (slot.status === 'cancelled') return false;
    if (this.isCurrentlyBookable(slot)) return true;

    if (this.slotVisibilityMode === 'show_all_with_status') {
      return !this.isSlotPast(slot);
    }

    if (this.isSlotOutsideBookingWindow(slot)) {
      return this.showSlotsOutsideWindow;
    }
    if (this.isSlotFull(slot)) {
      return this.showFullyBookedSlots || this.slotVisibilityMode !== 'hide_unavailable';
    }
    if (this.isSlotAdvanceBlocked(slot) || this.isSameDayBlocked(slot) || this.isSlotStatusDisabled(slot)) {
      return this.slotVisibilityMode !== 'hide_unavailable';
    }
    if (this.isSlotPast(slot)) return false;
    return this.slotVisibilityMode !== 'hide_unavailable';
  }

  analyzeSlots(slots: Slot[], date: string): DayMeta {
    const list = (slots || []).filter((s) => s.status !== 'cancelled');
    if (!list.length) {
      return {
        badge: this.isLikelyHoliday(date) ? 'holiday' : 'noschedule',
        bookableCount: 0,
        hasSchedule: false,
        allFull: false,
        earliestStartIso: null
      };
    }

    let earliest: string | null = null;
    let earliestMs = Infinity;
    let bookableCount = 0;
    let futureOrOpen = 0;
    let fullCount = 0;

    for (const s of list) {
      const startMs = new Date(s.start_time).getTime();
      if (!Number.isNaN(startMs) && startMs < earliestMs) {
        earliestMs = startMs;
        earliest = s.start_time;
      }
      if (this.isCurrentlyBookable(s)) bookableCount++;
      if (!this.isSlotPast(s) && !this.isSlotStatusDisabled(s)) {
        futureOrOpen++;
        if (this.isSlotFull(s)) fullCount++;
      }
    }

    const today = getKolkataToday();
    const allFull = futureOrOpen > 0 && fullCount === futureOrOpen;
    let badge: DayBadge = 'noschedule';
    if (bookableCount > 0) badge = 'available';
    else if (allFull) badge = 'full';
    else if (date === today) badge = 'today_closed';
    else if (list.some((s) => this.isSlotOutsideBookingWindow(s))) badge = 'opens_later';
    else badge = 'today_closed';

    return {
      badge,
      bookableCount,
      hasSchedule: true,
      allFull,
      earliestStartIso: earliest
    };
  }

  isLikelyHoliday(date: string): boolean {
    // Soft heuristic only (no holiday API on public booking): Sunday with no slots.
    const [y, m, d] = date.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return dow === 0;
  }

  canNavigate(target: WizardStep): boolean {
    // Course is not a wizard step. Branch is always the first reachable step.
    if (target === 'branch') return true;
    if (target === 'date') return !!this.selectedBranch;
    if (target === 'slot') {
      return (
        !!this.selectedBranch &&
        !!this.selectedDate &&
        (this.rawSlots.length > 0 ||
          this.slots.length > 0 ||
          ['slot', 'details', 'payment', 'done'].includes(this.step))
      );
    }
    if (target === 'details') return !!this.selectedSlot;
    if (target === 'payment') return !!this.paymentId;
    if (target === 'done') return this.step === 'done';
    return false;
  }

  vehicleOptions(slot: Slot) {
    return (slot.vehicle_capacities || []).filter((v) => (v.booked || 0) < (v.capacity || 0));
  }

  selectSlot(slot: Slot) {
    if (!this.canSelectSlot(slot)) return;
    if (!this.auth.isAuthenticated()) {
      // Preserve ?course= / ?branch= so course-locked state survives Google OAuth return.
      sessionStorage.setItem('oauth_return_url', this.bookingReturnUrl());
      this.auth.signInWithGoogle();
      return;
    }
    this.selectedSlot = slot;
    const opts = this.vehicleOptions(slot);
    this.selectedVehicleId = opts[0]?.vehicle_id || '';
    this.step = 'details';
  }

  /** Keep course/branch query on auth round-trips so selectedCourse can be restored. */
  private bookingReturnUrl(): string {
    const params = new URLSearchParams();
    const courseSlug =
      this.selectedCourse?.slug || this.route.snapshot.queryParamMap.get('course');
    const branchSlug =
      this.selectedBranch?.slug || this.route.snapshot.queryParamMap.get('branch');
    if (courseSlug) params.set('course', courseSlug);
    if (branchSlug) params.set('branch', branchSlug);
    const qs = params.toString();
    return qs ? `/booking?${qs}` : '/booking';
  }

  canSelectSlot(slot: Slot): boolean {
    const state = this.slotUiState(slot);
    return state === 'available' || state === 'selected';
  }

  isSlotAdvanceBlocked(slot: Slot): boolean {
    const startMs = new Date(slot.start_time).getTime();
    if (Number.isNaN(startMs)) return false;
    const minStart = Date.now() + this.MIN_ADVANCE_HOURS * 60 * 60 * 1000;
    return startMs < minStart;
  }

  /** Mirrors backend visibilityWindowHours — slot not open for booking yet. */
  isSlotOutsideBookingWindow(slot: Slot): boolean {
    const startMs = new Date(slot.start_time).getTime();
    if (Number.isNaN(startMs)) return false;
    const maxStart = Date.now() + this.VISIBILITY_HOURS * 60 * 60 * 1000;
    return startMs > maxStart;
  }

  isSlotPast(slot: Slot): boolean {
    const startMs = new Date(slot.start_time).getTime();
    if (Number.isNaN(startMs)) return false;
    return startMs <= Date.now();
  }

  isSlotFull(slot: Slot): boolean {
    if (slot.status === 'full') return true;
    return this.remainingSeats(slot) <= 0;
  }

  isSlotStatusDisabled(slot: Slot): boolean {
    return slot.status === 'disabled' || slot.status === 'cancelled' || slot.status === 'completed';
  }

  /** Customer-facing seats left — never invent a default capacity. */
  remainingSeats(slot: Slot): number {
    if (slot.remaining_capacity != null && Number.isFinite(Number(slot.remaining_capacity))) {
      return Math.max(0, Number(slot.remaining_capacity));
    }
    const cap = Number(slot.live_capacity ?? slot.capacity);
    if (!Number.isFinite(cap) || cap <= 0) return 0;
    return Math.max(0, cap - Number(slot.booked_count || 0));
  }

  slotDurationMinutes(slot: Slot): number {
    if (slot.duration_minutes && slot.duration_minutes > 0) return slot.duration_minutes;
    const start = new Date(slot.start_time).getTime();
    const end = new Date(slot.end_time).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 30;
    return Math.round((end - start) / 60000);
  }

  slotDurationLabel(slot: Slot): string {
    const m = this.slotDurationMinutes(slot);
    return `${m} Minute${m === 1 ? '' : 's'}`;
  }

  trainerName(slot: Slot): string {
    return slot.trainer?.profile?.full_name || 'Trainer TBD';
  }

  vehicleSummary(slot: Slot): string {
    const rows = slot.vehicle_capacities || [];
    if (!rows.length) return 'Vehicle TBD';
    return rows.map((v) => v.vehicle_name).filter(Boolean).join(', ') || 'Vehicle TBD';
  }

  slotUiState(slot: Slot): SlotUiState {
    if (this.selectedSlot?.id === slot.id) return 'selected';
    if (this.isSlotPast(slot)) return 'past';
    if (this.isSlotStatusDisabled(slot)) return 'disabled';
    if (this.isSlotFull(slot)) return 'booked';
    if (this.isSameDayBlocked(slot)) return 'disabled';
    if (this.isSlotAdvanceBlocked(slot)) return 'disabled';
    if (this.isSlotOutsideBookingWindow(slot)) return 'disabled';
    return 'available';
  }

  slotTitle(slot: Slot): string | null {
    if (this.isSlotPast(slot)) return 'This slot has already started.';
    if (this.isSlotStatusDisabled(slot)) return 'This slot is disabled.';
    if (this.isSlotFull(slot)) return 'This slot is fully booked.';
    if (this.isSameDayBlocked(slot)) return 'Same-day bookings are not allowed.';
    if (this.isSlotAdvanceBlocked(slot)) return this.ADVANCE_UNAVAILABLE_TITLE;
    if (this.isSlotOutsideBookingWindow(slot)) return this.WINDOW_UNAVAILABLE_TITLE;
    return null;
  }

  slotPeriod(slot: Slot): SlotPeriod {
    const hour = this.kolkataHour(slot.start_time);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private kolkataHour(iso: string): number {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        hour12: false
      }).formatToParts(new Date(iso));
      const h = parts.find((p) => p.type === 'hour')?.value;
      return Number(h) || 0;
    } catch {
      const time = extractTime(iso);
      return time ? parseInt(time.split(':')[0], 10) : 0;
    }
  }

  onReceiptSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.receiptFile = input.files?.[0] || null;
    this.paymentError = '';
    this.uploadProgress = 0;
  }

  slotAvailability(slot: Slot): number {
    const cap = Number(slot.live_capacity ?? slot.capacity ?? 0);
    const left = this.remainingSeats(slot);
    if (cap <= 0) return 0;
    return Math.round((left / cap) * 100);
  }

  slotAvailabilityLabel(slot: Slot): string {
    const state = this.slotUiState(slot);
    if (state === 'past') return 'Past';
    if (this.isSlotAdvanceBlocked(slot) && !this.isSlotPast(slot) && !this.isSlotFull(slot)) {
      return 'Too soon';
    }
    if (this.isSlotOutsideBookingWindow(slot) && !this.isSlotPast(slot)) {
      return 'Opens later';
    }
    if (state === 'disabled') return 'Unavailable';
    if (state === 'booked' || this.remainingSeats(slot) <= 0) return 'Full';
    const left = this.remainingSeats(slot);
    return `${left} Seat${left === 1 ? '' : 's'} Left`;
  }

  formatTimeRange(slot: Slot): string {
    return `${this.formatTime(slot.start_time)} – ${this.formatTime(slot.end_time)}`;
  }

  get payableLabel(): string {
    if (this.createdBooking?.coupon?.final_amount != null) {
      return `₹${this.createdBooking.coupon.final_amount}`;
    }
    if (this.couponResult?.final_amount != null) {
      return `₹${this.couponResult.final_amount}`;
    }
    return this.selectedCourse?.price_label || '';
  }

  async applyCoupon() {
    this.couponError = '';
    this.couponResult = null;
    const code = this.couponCode.trim();
    if (!code) {
      this.couponError = 'Enter a coupon code';
      return;
    }
    if (!this.selectedCourse) {
      this.toast.error(
        'A course is required to apply a coupon.'
      );
      return;
    }
    const amount = Number(this.selectedCourse.amount_inr) || 0;
    this.couponValidating = true;
    try {
      this.couponResult = await this.coupons.validate(
        code,
        amount,
        this.selectedBranch?.id,
        this.selectedVehicleId || null
      );
      this.toast.success(`Coupon applied — save ₹${this.couponResult.discount_amount}`);
    } catch (e) {
      this.couponError = getApiErrorMessage(e, 'Invalid coupon');
    } finally {
      this.couponValidating = false;
    }
  }

  clearCoupon() {
    this.couponCode = '';
    this.couponResult = null;
    this.couponError = '';
  }

  async confirmDetails() {
    // Never fail silently — same toast.error convention as phone/vehicle/API errors.
    if (!this.selectedCourse) {
      this.handleMissingCourseContext();
      return;
    }
    if (!this.selectedBranch) {
      this.toast.error('Please select a branch to continue.');
      this.step = 'branch';
      return;
    }
    if (!this.selectedSlot) {
      this.toast.error('Please select a time slot to continue.');
      this.step = this.rawSlots.length || this.slots.length ? 'slot' : 'date';
      return;
    }
    if (!/^\d{10}$/.test(this.phone)) {
      this.toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    if (!this.selectedVehicleId) {
      this.toast.error('Select a vehicle');
      return;
    }
    this.loading = true;
    try {
      const booking = await firstValueFrom(
        this.api.createBooking(this.selectedSlot.id, {
          phone: this.phone,
          notes: this.notes,
          vehicle_id: this.selectedVehicleId,
          branch_id: this.selectedBranch.id,
          course_id: this.selectedCourse.id,
          coupon_code: this.couponResult ? this.couponCode.trim() : undefined
        })
      );
      this.createdBooking = booking;
      this.referenceNumber = (booking as any)?.booking_reference || '';
      this.paymentId = (booking as any)?.payment?.id || '';
      this.step = 'payment';
      this.toast.success('Booking held. Upload your payment receipt to continue.');
    } catch (e: any) {
      this.toast.error(e?.error?.message || e?.message || 'Booking failed');
    } finally {
      this.loading = false;
    }
  }

  /**
   * selectedCourse missing at confirm — never call createBooking without course_id.
   * Toast + send to Courses (or course detail if slug known).
   */
  private handleMissingCourseContext(): void {
    const courseSlug = this.route.snapshot.queryParamMap.get('course');

    this.toast.error(
      courseSlug
        ? 'We lost track of your selected course — please choose it again.'
        : 'A course is required to complete booking. Please pick a course and try again.'
    );

    if (courseSlug) {
      void this.router.navigate(['/courses', courseSlug]);
      return;
    }
    void this.router.navigate(['/courses']);
  }

  async submitPayment() {
    if (!this.paymentId) {
      this.toast.error('Payment record missing');
      return;
    }
    if (!this.receiptFile) {
      this.toast.error('Attach a payment receipt (JPG, PNG, WebP, or PDF)');
      return;
    }
    if (!this.referenceNumber.trim()) {
      this.toast.error('Enter UPI / bank reference number');
      return;
    }
    this.loading = true;
    this.paymentError = '';
    this.uploadProgress = 5;
    const progressTimer = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress = Math.min(90, this.uploadProgress + 8);
      }
    }, 180);
    try {
      await this.payments.uploadReceipt(
        this.paymentId,
        this.receiptFile,
        this.referenceNumber.trim()
      );
      this.uploadProgress = 100;
      this.step = 'done';
      this.toast.success('Receipt submitted. Awaiting admin verification.');
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || 'Upload failed';
      this.paymentError = msg;
      this.uploadProgress = 0;
      this.toast.error(msg);
    } finally {
      clearInterval(progressTimer);
      this.loading = false;
    }
  }

  go(step: WizardStep) {
    if (!this.canNavigate(step)) return;
    this.step = step;
    if (step === 'details' || step === 'payment' || step === 'done') {
      this.coursePickerOpen = false;
    }
    if (step === 'date') {
      this.syncCalendarToSelected();
      void this.probeMonthAvailability();
    }
  }

  formatTime(iso: string) {
    const ampm = formatTimeToAMPM(iso);
    if (ampm) return ampm;
    try {
      return new Date(iso).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
    } catch {
      return iso;
    }
  }

  formatDisplayDate(ymd: string): string {
    const n = normalizeDate(ymd);
    if (!n) return ymd;
    const [y, m, d] = n.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  private slotsInPeriod(period: SlotPeriod): Slot[] {
    return this.displaySlots.filter((s) => this.slotPeriod(s) === period);
  }

  private buildDay(date: string, day: number, inMonth: boolean, today: string): CalendarDay {
    const isPast = date < today;
    const isToday = date === today;
    const isSelected = date === this.selectedDate;
    const meta = this.dayMeta.get(date);
    let badge: DayBadge = isPast ? 'none' : meta?.badge || 'none';
    const beyondWindow = this.isDateOutsideBookingWindow(date);
    if (!isPast && beyondWindow && badge === 'none') {
      badge = 'opens_later';
    }
    const sameDayBlocked = isToday && !this.allowSameDayBooking;
    const hideBeyond = beyondWindow && !this.showSlotsOutsideWindow;
    const isAvailable = badge === 'available';
    return {
      date,
      day,
      inMonth,
      isPast,
      isToday,
      isSelected,
      isAvailable,
      badge,
      disabled: !inMonth || isPast || sameDayBlocked || hideBeyond,
      badgeLabel: this.badgeLabel(badge)
    };
  }

  /** True when the calendar date's end-of-day is beyond the booking window. */
  isDateOutsideBookingWindow(date: string): boolean {
    try {
      const endOfDay = new Date(`${date}T23:59:59+05:30`).getTime();
      const maxStart = Date.now() + this.VISIBILITY_HOURS * 60 * 60 * 1000;
      return endOfDay > maxStart;
    } catch {
      return false;
    }
  }

  badgeLabel(badge: DayBadge): string {
    switch (badge) {
      case 'available':
        return 'Available';
      case 'opens_later':
        return 'Opens later';
      case 'full':
        return 'Full';
      case 'holiday':
        return 'Holiday';
      case 'noschedule':
        return 'Closed';
      case 'today_closed':
        return 'Closed';
      default:
        return '';
    }
  }

  badgeIcon(badge: DayBadge): string {
    switch (badge) {
      case 'available':
        return '🟢';
      case 'opens_later':
        return '🔒';
      case 'full':
        return '🔴';
      case 'holiday':
        return '🎉';
      case 'noschedule':
      case 'today_closed':
        return '·';
      default:
        return '';
    }
  }

  private syncCalendarToSelected() {
    const base = normalizeDate(this.selectedDate) || getKolkataToday();
    this.calendarYear = Number(base.slice(0, 4));
    this.calendarMonth = Number(base.slice(5, 7)) - 1;
  }

  private daysInMonth(year: number, month0: number): number {
    return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  }

  private padYmd(y: number, m: number, d: number): string {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private async probeMonthAvailability() {
    if (!this.selectedBranch) return;
    const token = ++this.probeToken;
    this.probingMonth = true;
    const today = getKolkataToday();
    const daysInMonth = this.daysInMonth(this.calendarYear, this.calendarMonth);
    const dates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = this.padYmd(this.calendarYear, this.calendarMonth + 1, d);
      if (date >= today) dates.push(date);
    }

    const branchId = this.selectedBranch.id;
    const concurrency = 4;
    try {
      for (let i = 0; i < dates.length; i += concurrency) {
        if (token !== this.probeToken) return;
        const batch = dates.slice(i, i + concurrency);
        const results = await Promise.all(
          batch.map(async (date) => {
            try {
              const slots = await this.slotsApi.getSlotsByDate(date, {
                bookableOnly: false,
                branchId
              });
              return { date, meta: this.analyzeSlots(slots, date) };
            } catch {
              return {
                date,
                meta: {
                  badge: 'noschedule' as DayBadge,
                  bookableCount: 0,
                  hasSchedule: false,
                  allFull: false,
                  earliestStartIso: null
                }
              };
            }
          })
        );
        if (token !== this.probeToken) return;
        const next = new Map(this.dayMeta);
        for (const r of results) next.set(r.date, r.meta);
        this.dayMeta = next;
      }
    } finally {
      if (token === this.probeToken) this.probingMonth = false;
    }
  }
}
