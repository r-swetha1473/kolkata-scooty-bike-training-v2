import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { CandidatesService } from '../../../services/candidates.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { balanceLabel, dueBetween, paidExceedsFee } from '../../../utils/candidate-money';
import { getKolkataToday } from '../../../utils/date.utils';
import { INVALID_MOBILE_MESSAGE, normalizeStrictIndianMobile } from '../../../utils/phone-normalize';

@Component({
  selector: 'app-candidate-admission',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="admin-page admission-page">
      <header class="admin-hero">
        <div>
          <h1>New admission</h1>
          <p>One candidate, one fee plan, and the first payment if any.</p>
        </div>
      </header>

      <form class="card" (ngSubmit)="save()" novalidate>
        <label for="name">Name</label>
        <input id="name" name="name" class="admin-input" [(ngModel)]="name" autocomplete="name" required />
        <p class="err" *ngIf="errors.name">{{ errors.name }}</p>

        <label for="mobile">Mobile number</label>
        <input id="mobile" name="mobile" class="admin-input" type="tel" inputmode="numeric" autocomplete="tel" maxlength="16" [(ngModel)]="mobile" placeholder="9876543210" required />
        <p class="err" *ngIf="errors.mobile">{{ errors.mobile }}</p>
        <p class="dup" *ngIf="duplicate">
          This number is already used by {{ duplicate.name }}.
          <a [routerLink]="['/admin/candidates', duplicate.id]">Open portfolio</a>
        </p>

        <label for="admitted">Admission date</label>
        <input id="admitted" name="admitted" class="admin-input" type="date" [(ngModel)]="admissionDate" />

        <label for="trainer">Trainer</label>
        <select id="trainer" name="trainer" class="admin-select" [(ngModel)]="trainerId">
          <option value="">Unassigned</option>
          <option *ngFor="let trainer of trainers" [value]="trainer.id">{{ trainer.name }}</option>
        </select>

        <label for="total">Total fee (₹)</label>
        <input id="total" name="total" class="admin-input" type="text" inputmode="decimal" [(ngModel)]="totalFee" placeholder="0.00" />
        <p class="err" *ngIf="errors.total">{{ errors.total }}</p>

        <label for="paid">Amount paid now (₹)</label>
        <input id="paid" name="paid" class="admin-input" type="text" inputmode="decimal" [(ngModel)]="amountPaid" placeholder="0.00" />
        <p class="err" *ngIf="errors.paid">{{ errors.paid }}</p>

        <p class="due" [class.overpaid]="balance.tone === 'overpaid'">{{ balance.text }}</p>
        <p class="hint">Due is calculated from the total fee minus the amount paid. It is not typed in.</p>

        <p class="err" *ngIf="formError">{{ formError }}</p>
        <div class="actions">
          <a routerLink="/admin/candidates" class="admin-btn admin-btn-secondary">Cancel</a>
          <button type="submit" class="admin-btn admin-btn-primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save admission' }}</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .card { max-width: 36rem; display: grid; gap: 0.35rem; }
    label { font-size: 0.875rem; font-weight: 600; margin-top: 0.45rem; }
    .admin-input, .admin-select { font-size: 16px; width: 100%; }
    .due { font-size: 1.15rem; font-weight: 700; margin: 0.8rem 0 0; }
    .due.over { color: #b91c1c; }
    .overpaid { color: #1d4ed8; }
    .hint { color: #64748b; font-size: 0.8125rem; margin: 0; }
    .err { color: #b91c1c; margin: 0; font-size: 0.875rem; }
    .dup { background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 0.6rem 0.75rem; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.8rem; flex-wrap: wrap; }
  `]
})
export class CandidateAdmissionComponent implements OnInit {
  name = '';
  mobile = '';
  admissionDate = '';
  trainerId = '';
  totalFee = '';
  amountPaid = '';
  trainers: Array<{ id: string; name: string }> = [];
  errors: { name?: string; mobile?: string; total?: string; paid?: string } = {};
  formError = '';
  duplicate: { id: string; name: string } | null = null;
  saving = false;

  constructor(
    private candidates: CandidatesService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.admissionDate = getKolkataToday();
    void this.loadTrainers();
  }

  get balance() {
    const due = dueBetween(this.totalFee || '0', this.amountPaid || '0');
    if (due == null) return { text: '—', tone: 'clear' as const };
    return balanceLabel(due);
  }

  get paidTooHigh(): boolean {
    return paidExceedsFee(this.totalFee || '0', this.amountPaid || '0');
  }

  async save(): Promise<void> {
    this.formError = '';
    this.duplicate = null;
    this.errors = {};
    if (!this.name.trim()) this.errors.name = 'Enter the candidate name.';
    if (!normalizeStrictIndianMobile(this.mobile)) this.errors.mobile = INVALID_MOBILE_MESSAGE;
    if (dueBetween(this.totalFee, '0') == null) this.errors.total = 'Enter a total fee of 0 or more.';
    if (dueBetween('0', this.amountPaid || '0') == null && this.amountPaid !== '') {
      this.errors.paid = 'Enter an amount paid of 0 or more.';
    }
    if (this.paidTooHigh) this.errors.paid = 'Amount paid cannot be more than the total fee.';
    if (this.errors.name || this.errors.mobile || this.errors.total || this.errors.paid) return;

    this.saving = true;
    try {
      const created = await this.candidates.admit({
        name: this.name.trim(),
        mobile: this.mobile,
        admission_date: this.admissionDate,
        trainer_id: this.trainerId || null,
        total_fee: this.totalFee || '0',
        amount_paid: this.amountPaid || '0',
        method: 'CASH'
      });
      await this.router.navigate(['/admin/candidates', created.candidate.id]);
    } catch (error: unknown) {
      const body = (error as { error?: { errorCode?: string; candidate?: { id: string; name: string } } })?.error;
      if (body?.errorCode === 'DUPLICATE_MOBILE' && body.candidate?.id) {
        this.duplicate = body.candidate;
        this.errors.mobile = 'This mobile number is already used by a candidate.';
      } else {
        this.formError = getApiErrorMessage(error, 'Could not save this admission. Nothing was saved.');
      }
    } finally {
      this.saving = false;
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
}
