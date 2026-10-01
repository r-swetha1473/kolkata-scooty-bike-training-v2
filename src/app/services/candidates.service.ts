import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpService } from './http.service';

export interface CandidateListRow {
  id: string;
  name: string;
  mobile: string;
  admission_date: string;
  trainer_id: string | null;
  trainer_label: string;
  status: string;
  profile_id: string | null;
  total_fee: string;
  paid_total: string;
  due_total: string;
  classes_completed: number;
}

export interface CandidateFee {
  total_fee: string;
  paid_total: string;
  due_total: string;
  classes_completed: number;
  course_label?: string | null;
}

export interface CandidatePayment {
  id: string;
  amount: string;
  paid_on: string;
  method: string;
  reference?: string | null;
  note?: string | null;
  voided: boolean;
  voided_at?: string | null;
  void_reason?: string | null;
}

export interface CandidateClass {
  id: string;
  class_date: string;
  attendance: string;
  note?: string | null;
  trainer_name?: string | null;
  vehicle_name?: string | null;
}

export interface CandidatePortfolio {
  candidate: {
    id: string;
    name: string;
    mobile: string;
    admission_date: string;
    trainer_id: string | null;
    trainer_label: string;
    status: string;
    notes?: string | null;
    profile_id?: string | null;
  };
  fee: CandidateFee;
  payments: CandidatePayment[];
  classes: CandidateClass[];
  profile: { id: string; full_name: string; email: string } | null;
}

@Injectable({ providedIn: 'root' })
export class CandidatesService {
  constructor(private http: HttpService) {}

  list(params: Record<string, string>) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) qs.set(key, value);
    });
    const query = qs.toString();
    return firstValueFrom(
      this.http.get<{ candidates: CandidateListRow[]; total: number; limit: number; offset: number }>(
        `/candidates${query ? `?${query}` : ''}`
      )
    );
  }

  exportCsv(params: Record<string, string>) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) qs.set(key, value);
    });
    return firstValueFrom(this.http.getBlob(`/candidates/export?${qs.toString()}`));
  }

  admit(body: Record<string, unknown>) {
    return firstValueFrom(this.http.post<{ candidate: { id: string } }>('/candidates', body));
  }

  portfolio(id: string) {
    return firstValueFrom(this.http.get<CandidatePortfolio>(`/candidates/${id}`));
  }

  update(id: string, body: Record<string, unknown>) {
    return firstValueFrom(this.http.put(`/candidates/${id}`, body));
  }

  addPayment(id: string, body: Record<string, unknown>, idempotencyKey: string) {
    return firstValueFrom(
      this.http.post(`/candidates/${id}/payments`, body, { 'Idempotency-Key': idempotencyKey })
    );
  }

  voidPayment(id: string, paymentId: string, reason: string) {
    return firstValueFrom(this.http.put(`/candidates/${id}/payments/${paymentId}/void`, { reason }));
  }

  addClass(id: string, body: Record<string, unknown>) {
    return firstValueFrom(this.http.post(`/candidates/${id}/classes`, body));
  }

  updateClass(id: string, classId: string, body: Record<string, unknown>) {
    return firstValueFrom(this.http.put(`/candidates/${id}/classes/${classId}`, body));
  }
}
