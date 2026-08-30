import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';

export interface Payment {
  id: string;
  booking_id: string;
  user_id?: string;
  amount: number;
  currency: string;
  reference_number?: string;
  receipt_path?: string;
  status: 'pending_upload' | 'pending_verification' | 'verified' | 'rejected' | 'partial';
  rejection_reason?: string;
  booking_status?: string;
  booking_reference?: string;
  booking_source?: string;
  offline_customer_name?: string;
  course_name?: string;
  branch_name?: string;
  user_email?: string;
  user_name?: string;
  slot_start?: string;
  slot_date?: string;
  payment_method?: string;
  payment_date?: string;
  payment_notes?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at?: string;
  /** Derived client-side when API has no method column: UPI vs Manual */
  method?: 'UPI' | 'Manual';
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(json = true): HttpHeaders {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    if (json) headers['Content-Type'] = 'application/json';
    return new HttpHeaders(headers);
  }

  myPayments(): Promise<Payment[]> {
    return firstValueFrom(
      this.http.get<Payment[]>(`${this.apiUrl}/payments/my`, { headers: this.authHeaders() })
    );
  }

  get(id: string): Promise<Payment> {
    return firstValueFrom(
      this.http.get<Payment>(`${this.apiUrl}/payments/${id}`, { headers: this.authHeaders() })
    );
  }

  uploadReceipt(paymentId: string, file: File, referenceNumber: string): Promise<Payment> {
    const form = new FormData();
    form.append('receipt', file);
    form.append('reference_number', referenceNumber || '');
    return firstValueFrom(
      this.http.post<Payment>(`${this.apiUrl}/payments/${paymentId}/receipt`, form, {
        headers: this.authHeaders(false)
      })
    );
  }

  adminList(params?: { status?: string; branch_id?: string }): Promise<Payment[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.branch_id) q.set('branch_id', params.branch_id);
    const qs = q.toString() ? `?${q}` : '';
    return firstValueFrom(
      this.http.get<Payment[]>(`${this.apiUrl}/payments${qs}`, { headers: this.authHeaders() })
    );
  }

  approve(id: string): Promise<Payment> {
    return firstValueFrom(
      this.http.post<Payment>(`${this.apiUrl}/payments/${id}/approve`, {}, { headers: this.authHeaders() })
    );
  }

  reject(id: string, reason?: string): Promise<Payment> {
    return firstValueFrom(
      this.http.post<Payment>(
        `${this.apiUrl}/payments/${id}/reject`,
        { reason },
        { headers: this.authHeaders() }
      )
    );
  }

  receiptUrl(id: string): string {
    return `${this.apiUrl}/payments/${id}/receipt-file`;
  }

  /** Open receipt in a new tab (Cloudinary HTTPS URL or authenticated API stream). */
  async openReceipt(payment: Pick<Payment, 'id' | 'receipt_path'>): Promise<void> {
    if (!payment?.receipt_path) {
      throw new Error('No receipt uploaded for this payment');
    }

    // Durable Cloudinary (or other remote) URL stored directly on the payment row
    if (/^https?:\/\//i.test(payment.receipt_path)) {
      window.open(payment.receipt_path, '_blank', 'noopener');
      return;
    }

    const token = getAuthToken();
    const res = await fetch(this.receiptUrl(payment.id), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json, */*'
      }
    });

    if (!res.ok) {
      let message = 'Could not open receipt';
      try {
        const errBody = await res.json();
        if (errBody?.message) message = errBody.message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as { url?: string };
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener');
        return;
      }
      throw new Error('Receipt URL missing from server response');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
