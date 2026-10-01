import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { CandidatePortfolio, CandidatesService } from '../../../services/candidates.service';
import { HttpService } from '../../../services/http.service';
import { PermissionService } from '../../../services/permission.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { balanceLabel, dueBetween, formatInr, paidExceedsFee, toPaise } from '../../../utils/candidate-money';
import { getKolkataToday } from '../../../utils/date.utils';

@Component({
  selector: 'app-candidate-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="admin-page portfolio" *ngIf="data">
      <a routerLink="/admin/candidates" class="back">All candidates</a>
      <header class="admin-hero">
        <div>
          <h1>{{ data.candidate.name }}</h1>
          <p>
            {{ data.candidate.mobile }} · {{ data.candidate.trainer_label || 'Unassigned' }} ·
            Admitted {{ day(data.candidate.admission_date) }} · {{ data.candidate.status }}
          </p>
          <p class="badge" *ngIf="data.profile">Linked customer account: {{ data.profile.full_name }}</p>
        </div>
        <div class="admin-hero-actions" *ngIf="perms.can('candidates', 'edit')">
          <button type="button" class="admin-btn admin-btn-secondary" (click)="editing = !editing">{{ editing ? 'Close edit' : 'Edit' }}</button>
        </div>
      </header>

      <form class="card" *ngIf="editing" (ngSubmit)="saveEdit()">
        <label>Name</label>
        <input class="admin-input" [(ngModel)]="edit.name" name="name" />
        <label>Mobile</label>
        <input class="admin-input" type="tel" inputmode="numeric" [(ngModel)]="edit.mobile" name="mobile" />
        <label>Trainer</label>
        <select class="admin-select" [(ngModel)]="edit.trainer_id" name="trainer">
          <option value="">Unassigned</option>
          <option *ngFor="let trainer of trainers" [value]="trainer.id">{{ trainer.name }}</option>
        </select>
        <label>Status</label>
        <select class="admin-select" [(ngModel)]="edit.status" name="status">
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="DROPPED">Dropped</option>
        </select>
        <label>Total fee (₹)</label>
        <input class="admin-input" inputmode="decimal" [(ngModel)]="edit.total_fee" name="total" />
        <label>Notes</label>
        <textarea class="admin-input" [(ngModel)]="edit.notes" name="notes" rows="3"></textarea>
        <p class="err" *ngIf="editError">{{ editError }}</p>
        <button type="submit" class="admin-btn admin-btn-primary" [disabled]="saving">Save changes</button>
      </form>

      <section class="card bill">
        <h2>Bill</h2>
        <div class="bill-grid">
          <div><span>Total</span><strong>{{ inr(data.fee.total_fee) }}</strong></div>
          <div><span>Paid</span><strong>{{ inr(data.fee.paid_total) }}</strong></div>
          <div><span>Due</span><strong [class.due]="bill.tone === 'due'" [class.overpaid]="bill.tone === 'overpaid'">{{ bill.text }}</strong></div>
        </div>
        <div class="bar" aria-hidden="true"><span [style.width.%]="progress"></span></div>
      </section>

      <section class="card">
        <div class="section-head">
          <h2>Payments</h2>
          <button *ngIf="perms.can('candidates_payments', 'create')" type="button" class="admin-btn admin-btn-primary admin-btn-sm" (click)="openPayment()">Add payment</button>
        </div>
        <form *ngIf="showPayment" class="inline" (ngSubmit)="savePayment()">
          <input class="admin-input" inputmode="decimal" [(ngModel)]="payment.amount" name="amount" placeholder="Amount" />
          <input class="admin-input" type="date" [(ngModel)]="payment.paid_on" name="paid_on" />
          <select class="admin-select" [(ngModel)]="payment.method" name="method">
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK">Bank</option>
            <option value="OTHER">Other</option>
          </select>
          <input class="admin-input" [(ngModel)]="payment.reference" name="reference" placeholder="Reference" />
          <label class="check" *ngIf="perms.can('candidates_payments', 'edit')">
            <input type="checkbox" [(ngModel)]="payment.override" name="override" /> Allow amount above the due
          </label>
          <input *ngIf="payment.override" class="admin-input" [(ngModel)]="payment.override_reason" name="override_reason" placeholder="Reason for the extra amount" />
          <p class="preview" [class.overpaid]="paymentTone === 'overpaid'">After this payment: {{ paymentDueLabel }}</p>
          <p class="err" *ngIf="paymentError">{{ paymentError }}</p>
          <button type="submit" class="admin-btn admin-btn-primary" [disabled]="saving">Save payment</button>
        </form>
        <div class="admin-table-container">
          <table class="admin-data-table">
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let payment of data.payments" [class.voided]="payment.voided">
                <td>{{ day(payment.paid_on) }}</td>
                <td>{{ inr(payment.amount) }}</td>
                <td>{{ payment.method }}</td>
                <td>{{ payment.voided ? ('Voided: ' + (payment.void_reason || '')) : (payment.note || payment.reference || '') }}</td>
                <td>
                  <button *ngIf="!payment.voided && perms.can('candidates_payments', 'delete')" type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="startVoid(payment.id)">Void</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <form *ngIf="voidingId" class="inline" (ngSubmit)="confirmVoid()">
          <input class="admin-input" [(ngModel)]="voidReason" name="voidReason" placeholder="Reason for voiding" />
          <button type="submit" class="admin-btn admin-btn-secondary" [disabled]="saving">Confirm void</button>
        </form>
      </section>

      <section class="card">
        <div class="section-head">
          <h2>Classes</h2>
          <strong>{{ data.fee.classes_completed }} completed</strong>
          <button *ngIf="perms.can('candidates', 'edit')" type="button" class="admin-btn admin-btn-primary admin-btn-sm" (click)="showClass = !showClass">Add class</button>
        </div>
        <form *ngIf="showClass" class="inline" (ngSubmit)="saveClass()">
          <input class="admin-input" type="date" [(ngModel)]="classForm.class_date" name="class_date" />
          <select class="admin-select" [(ngModel)]="classForm.attendance" name="attendance">
            <option value="ATTENDED">Attended</option>
            <option value="NO_SHOW">No-show</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select class="admin-select" [(ngModel)]="classForm.trainer_id" name="class_trainer">
            <option value="">Same / unassigned</option>
            <option *ngFor="let trainer of trainers" [value]="trainer.id">{{ trainer.name }}</option>
          </select>
          <select class="admin-select" [(ngModel)]="classForm.vehicle_id" name="class_vehicle">
            <option value="">No vehicle</option>
            <option *ngFor="let vehicle of vehicles" [value]="vehicle.id">{{ vehicle.name }}</option>
          </select>
          <input class="admin-input" [(ngModel)]="classForm.note" name="class_note" placeholder="Note" />
          <p class="err" *ngIf="classError">{{ classError }}</p>
          <button type="submit" class="admin-btn admin-btn-primary" [disabled]="saving">Save class</button>
        </form>
        <div class="admin-table-container">
          <table class="admin-data-table">
            <thead><tr><th>Date</th><th>Attendance</th><th>Trainer</th><th>Vehicle</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let row of data.classes">
                <td>{{ day(row.class_date) }}</td>
                <td>{{ row.attendance }}</td>
                <td>{{ row.trainer_name || 'Unassigned' }}</td>
                <td>{{ row.vehicle_name || '—' }}</td>
                <td class="quick" *ngIf="perms.can('candidates', 'edit')">
                  <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="mark(row.id, 'ATTENDED')">Attended</button>
                  <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="mark(row.id, 'NO_SHOW')">No-show</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
    <p class="err" *ngIf="loadError">{{ loadError }}</p>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 0.5rem; }
    .badge { display: inline-block; background: #ecfdf5; color: #065f46; border-radius: 999px; padding: 0.2rem 0.6rem; font-size: 0.8125rem; }
    .card { margin-bottom: 0.9rem; }
    .bill-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .bill-grid span { display: block; color: #64748b; font-size: 0.75rem; }
    .due { color: #b91c1c; }
    .overpaid { color: #1d4ed8; font-weight: 700; }
    .bar { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-top: 0.6rem; }
    .bar span { display: block; height: 100%; background: #1d4ed8; }
    .section-head { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between; }
    .inline { display: grid; gap: 0.4rem; margin: 0.6rem 0; }
    .admin-input, .admin-select, textarea { font-size: 16px; width: 100%; }
    .voided { color: #94a3b8; text-decoration: line-through; }
    .err { color: #b91c1c; }
    .quick { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .check { display: flex; gap: 0.35rem; align-items: center; }
    @media (max-width: 720px) {
      .bill-grid { grid-template-columns: 1fr; }
      .admin-table-container { overflow-x: auto; }
    }
  `]
})
export class CandidatePortfolioComponent implements OnInit {
  data: CandidatePortfolio | null = null;
  trainers: Array<{ id: string; name: string }> = [];
  vehicles: Array<{ id: string; name: string }> = [];
  editing = false;
  showPayment = false;
  showClass = false;
  saving = false;
  loadError = '';
  editError = '';
  paymentError = '';
  classError = '';
  voidingId = '';
  voidReason = '';
  edit = { name: '', mobile: '', trainer_id: '', status: 'ACTIVE', notes: '', total_fee: '' };
  payment = { amount: '', paid_on: '', method: 'CASH', reference: '', override: false, override_reason: '' };
  private paymentKey = '';
  classForm = { class_date: '', attendance: 'ATTENDED', trainer_id: '', vehicle_id: '', note: '' };
  private id = '';

  constructor(
    private route: ActivatedRoute,
    private candidates: CandidatesService,
    private adminService: AdminService,
    private http: HttpService,
    private toast: ToastService,
    public perms: PermissionService
  ) {}

  ngOnInit(): void {
    this.payment.paid_on = getKolkataToday();
    this.classForm.class_date = getKolkataToday();
    void this.loadTrainers();
    void this.loadVehicles();
    this.route.paramMap.subscribe((params) => {
      this.id = params.get('id') || '';
      void this.load();
    });
  }

  get bill() {
    return balanceLabel(this.data?.fee.due_total || 0);
  }

  get progress(): number {
    const total = toPaise(this.data?.fee.total_fee || 0) || 0;
    const paid = toPaise(this.data?.fee.paid_total || 0) || 0;
    if (total <= 0) return paid > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((paid / total) * 100)));
  }

  get paymentDueLabel(): string {
    const due = dueBetween(this.data?.fee.due_total || '0', this.payment.amount || '0');
    if (due == null) return '—';
    return balanceLabel(due).text;
  }

  get paymentTone(): string {
    const due = dueBetween(this.data?.fee.due_total || '0', this.payment.amount || '0');
    return due == null ? 'clear' : balanceLabel(due).tone;
  }

  inr(value: string): string {
    return formatInr(value);
  }

  day(value: string | null | undefined): string {
    return String(value || '').slice(0, 10);
  }

  async load(): Promise<void> {
    this.loadError = '';
    try {
      this.data = await this.candidates.portfolio(this.id);
      this.edit = {
        name: this.data.candidate.name,
        mobile: this.data.candidate.mobile,
        trainer_id: this.data.candidate.trainer_id || '',
        status: this.data.candidate.status,
        notes: this.data.candidate.notes || '',
        total_fee: this.data.fee.total_fee
      };
    } catch (error) {
      this.loadError = getApiErrorMessage(error, 'Could not load this candidate');
    }
  }

  async saveEdit(): Promise<void> {
    this.editError = '';
    if (paidExceedsFee(this.edit.total_fee, this.data?.fee.paid_total || '0')) {
      this.editError = 'Total fee cannot be less than the amount already paid.';
      return;
    }
    this.saving = true;
    try {
      await this.candidates.update(this.id, {
        name: this.edit.name,
        mobile: this.edit.mobile,
        trainer_id: this.edit.trainer_id || null,
        status: this.edit.status,
        notes: this.edit.notes,
        total_fee: this.edit.total_fee
      });
      this.editing = false;
      await this.load();
      this.toast.success('Candidate updated');
    } catch (error) {
      this.editError = getApiErrorMessage(error, 'Could not save these changes');
    } finally {
      this.saving = false;
    }
  }

  openPayment(): void {
    this.showPayment = !this.showPayment;
    if (this.showPayment) this.paymentKey = crypto.randomUUID();
  }

  async savePayment(): Promise<void> {
    this.paymentError = '';
    if (!this.payment.override && paidExceedsFee(this.data?.fee.due_total || '0', this.payment.amount || '0')) {
      this.paymentError = 'This payment is more than the amount due.';
      return;
    }
    this.saving = true;
    try {
      await this.candidates.addPayment(this.id, {
        amount: this.payment.amount,
        paid_on: this.payment.paid_on,
        method: this.payment.method,
        reference: this.payment.reference || null,
        override: this.payment.override,
        override_reason: this.payment.override_reason
      }, this.paymentKey);
      this.showPayment = false;
      this.payment.amount = '';
      this.payment.override = false;
      this.payment.override_reason = '';
      await this.load();
      this.toast.success('Payment saved');
    } catch (error) {
      this.paymentError = getApiErrorMessage(error, 'Could not save this payment');
    } finally {
      this.saving = false;
    }
  }

  startVoid(paymentId: string): void {
    this.voidingId = paymentId;
    this.voidReason = '';
  }

  async confirmVoid(): Promise<void> {
    if (!this.voidReason.trim()) {
      this.toast.error('Enter a reason for voiding this payment.');
      return;
    }
    this.saving = true;
    try {
      await this.candidates.voidPayment(this.id, this.voidingId, this.voidReason.trim());
      this.voidingId = '';
      await this.load();
      this.toast.success('Payment voided');
    } catch (error) {
      this.toast.error(getApiErrorMessage(error, 'Could not void this payment'));
    } finally {
      this.saving = false;
    }
  }

  async saveClass(): Promise<void> {
    this.classError = '';
    this.saving = true;
    try {
      await this.candidates.addClass(this.id, {
        class_date: this.classForm.class_date,
        attendance: this.classForm.attendance,
        trainer_id: this.classForm.trainer_id || null,
        vehicle_id: this.classForm.vehicle_id || null,
        note: this.classForm.note || null
      });
      this.showClass = false;
      await this.load();
      this.toast.success('Class saved');
    } catch (error) {
      this.classError = getApiErrorMessage(error, 'Could not save this class');
    } finally {
      this.saving = false;
    }
  }

  async mark(classId: string, attendance: string): Promise<void> {
    try {
      await this.candidates.updateClass(this.id, classId, { attendance });
      await this.load();
    } catch (error) {
      this.toast.error(getApiErrorMessage(error, 'Could not update attendance'));
    }
  }

  private async loadTrainers(): Promise<void> {
    try {
      const rows = await this.adminService.getAllTrainers();
      this.trainers = (rows || [])
        .filter((row) => row.is_active !== false)
        .map((row) => ({ id: row.id, name: row.profile?.full_name || 'Trainer' }));
    } catch {
      this.trainers = [];
    }
  }

  private async loadVehicles(): Promise<void> {
    try {
      const rows = await firstValueFrom(this.http.get<Array<{ id: string; name: string }>>('/vehicles'));
      this.vehicles = (rows || []).map((row) => ({ id: row.id, name: row.name }));
    } catch {
      this.vehicles = [];
    }
  }
}
