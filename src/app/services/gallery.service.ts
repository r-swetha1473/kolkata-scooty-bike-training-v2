import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';
import { resolveMediaUrl } from '../utils/media-url';

export interface GalleryItem {
  id: string;
  branch_id?: string | null;
  title?: string | null;
  category?: string;
  image_url: string;
  sort_order?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class GalleryService {
  readonly apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(json = true): HttpHeaders {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headers);
  }

  list(activeOnly = true): Promise<GalleryItem[]> {
    return firstValueFrom(
      this.http.get<GalleryItem[]>(`${this.apiBaseUrl}/gallery?activeOnly=${activeOnly}`)
    );
  }

  create(payload: Partial<GalleryItem>): Promise<GalleryItem> {
    return firstValueFrom(
      this.http.post<GalleryItem>(`${this.apiBaseUrl}/gallery`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  update(id: string, payload: Partial<GalleryItem>): Promise<GalleryItem> {
    return firstValueFrom(
      this.http.put<GalleryItem>(`${this.apiBaseUrl}/gallery/id/${id}`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  delete(id: string): Promise<{ message: string; id: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string; id: string }>(`${this.apiBaseUrl}/gallery/id/${id}`, {
        headers: this.authHeaders(false)
      })
    );
  }

  uploadImage(file: File): Promise<{ image_url: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(
      this.http.post<{ image_url: string; url: string }>(
        `${this.apiBaseUrl}/gallery/upload-image`,
        formData,
        { headers: this.authHeaders(false) }
      )
    );
  }

  resolveImageUrl(imageUrl?: string | null): string {
    return resolveMediaUrl(imageUrl, '', this.apiBaseUrl);
  }
}
