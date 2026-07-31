import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'ks-admin-theme';
  private themeSubject = new BehaviorSubject<AppTheme>('light');
  readonly theme$ = this.themeSubject.asObservable();

  init(scope: 'admin' | 'public' = 'admin'): void {
    if (scope !== 'admin') return;
    const saved = (localStorage.getItem(this.storageKey) as AppTheme) || 'light';
    this.apply(saved);
  }

  getTheme(): AppTheme {
    return this.themeSubject.value;
  }

  toggle(): void {
    this.setTheme(this.themeSubject.value === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: AppTheme): void {
    this.apply(theme);
    localStorage.setItem(this.storageKey, theme);
  }

  private apply(theme: AppTheme): void {
    document.documentElement.setAttribute('data-theme', theme);
    this.themeSubject.next(theme);
  }
}
