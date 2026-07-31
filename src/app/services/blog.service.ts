import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';
import { resolveMediaUrl } from '../utils/media-url';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image_url?: string | null;
  category?: string | null;
  author_name?: string | null;
  status: 'draft' | 'published';
  published_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  reading_time_minutes?: number | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  readonly apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(json = true): HttpHeaders {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headers);
  }

  /** Public: published posts only */
  list(): Promise<BlogPost[]> {
    return firstValueFrom(this.http.get<BlogPost[]>(`${this.apiBaseUrl}/blogs`));
  }

  /** Admin: all posts including drafts */
  listAdmin(): Promise<BlogPost[]> {
    return firstValueFrom(
      this.http.get<BlogPost[]>(`${this.apiBaseUrl}/blogs/admin/all`, {
        headers: this.authHeaders(false)
      })
    );
  }

  getBySlug(slug: string): Promise<BlogPost> {
    return firstValueFrom(this.http.get<BlogPost>(`${this.apiBaseUrl}/blogs/${slug}`));
  }

  create(payload: Partial<BlogPost>): Promise<BlogPost> {
    return firstValueFrom(
      this.http.post<BlogPost>(`${this.apiBaseUrl}/blogs`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  update(id: string, payload: Partial<BlogPost>): Promise<BlogPost> {
    return firstValueFrom(
      this.http.put<BlogPost>(`${this.apiBaseUrl}/blogs/id/${id}`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  delete(id: string): Promise<{ message: string; id: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string; id: string }>(`${this.apiBaseUrl}/blogs/id/${id}`, {
        headers: this.authHeaders(false)
      })
    );
  }

  uploadImage(file: File): Promise<{ image_url: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(
      this.http.post<{ image_url: string; url: string }>(
        `${this.apiBaseUrl}/blogs/upload-image`,
        formData,
        { headers: this.authHeaders(false) }
      )
    );
  }

  resolveImageUrl(imageUrl?: string | null): string {
    return resolveMediaUrl(imageUrl, '', this.apiBaseUrl);
  }
}
