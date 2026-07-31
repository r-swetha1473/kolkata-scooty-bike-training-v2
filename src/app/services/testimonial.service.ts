import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';
import { resolveMediaUrl } from '../utils/media-url';

export interface Testimonial {
  id: string;
  branch_id?: string | null;
  customer_name: string;
  photo_url?: string | null;
  rating: number;
  review: string;
  course_name?: string | null;
  training_date?: string | null;
  display_order?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class TestimonialService {
  readonly apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(json = true): HttpHeaders {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headers);
  }

  list(activeOnly = true): Promise<Testimonial[]> {
    return firstValueFrom(
      this.http.get<Testimonial[]>(`${this.apiBaseUrl}/testimonials?activeOnly=${activeOnly}`)
    );
  }

  create(payload: Partial<Testimonial>): Promise<Testimonial> {
    return firstValueFrom(
      this.http.post<Testimonial>(`${this.apiBaseUrl}/testimonials`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  update(id: string, payload: Partial<Testimonial>): Promise<Testimonial> {
    return firstValueFrom(
      this.http.put<Testimonial>(`${this.apiBaseUrl}/testimonials/id/${id}`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  delete(id: string): Promise<{ message: string; id: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string; id: string }>(
        `${this.apiBaseUrl}/testimonials/id/${id}`,
        { headers: this.authHeaders(false) }
      )
    );
  }

  uploadImage(file: File): Promise<{ image_url: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(
      this.http.post<{ image_url: string; url: string }>(
        `${this.apiBaseUrl}/testimonials/upload-image`,
        formData,
        { headers: this.authHeaders(false) }
      )
    );
  }

  resolveImageUrl(imageUrl?: string | null): string {
    return resolveMediaUrl(imageUrl, '', this.apiBaseUrl);
  }
}
