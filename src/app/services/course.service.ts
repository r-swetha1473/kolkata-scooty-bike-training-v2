import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';

export interface Course {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_label: string;
  amount_inr: number;
  duration_label?: string;
  features?: string[];
  highlights?: string[];
  tagline?: string;
  difficulty?: string;
  image_url?: string;
  banner_image_url?: string;
  thumbnail_url?: string;
  mobile_image_url?: string;
  is_active: boolean;
  is_featured?: boolean;
  sort_order?: number;
  cta_text?: string;
  cta_link?: string;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  readonly apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(json = true): HttpHeaders {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headers);
  }

  list(activeOnly = true): Promise<Course[]> {
    return firstValueFrom(
      this.http.get<Course[]>(`${this.apiBaseUrl}/courses?activeOnly=${activeOnly}`)
    );
  }

  getBySlug(slug: string): Promise<Course> {
    return firstValueFrom(this.http.get<Course>(`${this.apiBaseUrl}/courses/${slug}`));
  }

  create(payload: Partial<Course>): Promise<Course> {
    return firstValueFrom(
      this.http.post<Course>(`${this.apiBaseUrl}/courses`, payload, { headers: this.authHeaders() })
    );
  }

  update(id: string, payload: Partial<Course>): Promise<Course> {
    return firstValueFrom(
      this.http.put<Course>(`${this.apiBaseUrl}/courses/id/${id}`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  delete(id: string): Promise<{ message: string; id: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string; id: string }>(`${this.apiBaseUrl}/courses/id/${id}`, {
        headers: this.authHeaders(false)
      })
    );
  }

  uploadImage(file: File): Promise<{ image_url: string; url: string; secure_url?: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(
      this.http.post<{ image_url: string; url: string; secure_url?: string }>(
        `${this.apiBaseUrl}/courses/upload-image`,
        formData,
        { headers: this.authHeaders(false) }
      )
    );
  }
}
