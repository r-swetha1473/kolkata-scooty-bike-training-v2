import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';
import { resolveMediaUrl } from '../utils/media-url';

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  contact_phone?: string;
  contact_email?: string;
  maps_url?: string;
  working_days?: number[];
  opening_time?: string;
  closing_time?: string;
  slot_duration_minutes?: number;
  default_slot_capacity?: number;
  image_url?: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class BranchService {
  readonly apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(json = true): HttpHeaders {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headers);
  }

  list(activeOnly = true): Promise<Branch[]> {
    return firstValueFrom(
      this.http.get<Branch[]>(`${this.apiBaseUrl}/branches?activeOnly=${activeOnly}`)
    );
  }

  getBySlug(slug: string): Promise<Branch> {
    return firstValueFrom(this.http.get<Branch>(`${this.apiBaseUrl}/branches/${slug}`));
  }

  create(payload: Partial<Branch>): Promise<Branch> {
    return firstValueFrom(
      this.http.post<Branch>(`${this.apiBaseUrl}/branches`, payload, { headers: this.authHeaders() })
    );
  }

  update(id: string, payload: Partial<Branch>): Promise<Branch> {
    return firstValueFrom(
      this.http.put<Branch>(`${this.apiBaseUrl}/branches/id/${id}`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  uploadImage(file: File): Promise<{ image_url: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(
      this.http.post<{ image_url: string; url: string }>(
        `${this.apiBaseUrl}/branches/upload-image`,
        formData,
        { headers: this.authHeaders(false) }
      )
    );
  }

  resolveImageUrl(imageUrl?: string | null): string {
    return resolveMediaUrl(imageUrl, '', this.apiBaseUrl);
  }

  mapsUrl(branch: Pick<Branch, 'name' | 'address' | 'maps_url'>): string {
    if (branch.maps_url?.trim()) return branch.maps_url.trim();
    const q = encodeURIComponent(`${branch.name} ${branch.address || ''} Kolkata`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
}
