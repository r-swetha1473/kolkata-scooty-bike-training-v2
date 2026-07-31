import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  start_at?: string | null;
  end_at?: string | null;
  min_amount?: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  used_count?: number;
  branch_id?: string | null;
  vehicle_id?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CouponValidateResult {
  valid: boolean;
  discount_amount: number;
  final_amount: number;
  coupon: Pick<
    Coupon,
    'id' | 'code' | 'description' | 'discount_type' | 'discount_value' | 'max_discount'
  >;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  readonly apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(json = true): HttpHeaders {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headers);
  }

  list(activeOnly = true): Promise<Coupon[]> {
    return firstValueFrom(
      this.http.get<Coupon[]>(`${this.apiBaseUrl}/coupons?activeOnly=${activeOnly}`)
    );
  }

  create(payload: Partial<Coupon>): Promise<Coupon> {
    return firstValueFrom(
      this.http.post<Coupon>(`${this.apiBaseUrl}/coupons`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  update(id: string, payload: Partial<Coupon>): Promise<Coupon> {
    return firstValueFrom(
      this.http.put<Coupon>(`${this.apiBaseUrl}/coupons/id/${id}`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  delete(id: string): Promise<{ message: string; id: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string; id: string }>(`${this.apiBaseUrl}/coupons/id/${id}`, {
        headers: this.authHeaders(false)
      })
    );
  }

  validate(
    code: string,
    amount: number,
    branch_id?: string | null,
    vehicle_id?: string | null
  ): Promise<CouponValidateResult> {
    return firstValueFrom(
      this.http.post<CouponValidateResult>(
        `${this.apiBaseUrl}/coupons/validate`,
        {
          code,
          amount,
          branch_id: branch_id || null,
          vehicle_id: vehicle_id || null
        },
        { headers: this.authHeaders() }
      )
    );
  }
}
