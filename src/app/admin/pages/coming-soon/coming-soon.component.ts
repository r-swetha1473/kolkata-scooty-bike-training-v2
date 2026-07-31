import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-coming-soon',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="admin-page">
      <header class="admin-hero">
        <div>
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <div class="admin-hero-actions">
          <a routerLink="/admin" class="admin-btn admin-btn-secondary">Back to dashboard</a>
        </div>
      </header>

      <div class="admin-empty-state coming-soon-panel">
        <div class="coming-soon-icon" aria-hidden="true">{{ icon }}</div>
        <h3>{{ title }} module</h3>
        <p>
          This content module is planned for a future release. Operational booking, payments,
          slots, and customer management continue to work as usual — no backend changes in this upgrade.
        </p>
        <ul class="coming-soon-list">
          <li *ngFor="let item of bullets">{{ item }}</li>
        </ul>
      </div>
    </div>
  `
})
export class AdminComingSoonComponent implements OnInit {
  title = 'Coming soon';
  subtitle = 'Premium CMS module reserved in the admin navigation.';
  icon = 'KS';
  bullets: string[] = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const d = this.route.snapshot.data || {};
    this.title = d['title'] || this.title;
    this.subtitle = d['subtitle'] || this.subtitle;
    this.icon = d['icon'] || this.icon;
    this.bullets = d['bullets'] || [
      'UI shell and navigation are ready',
      'API & database schema will land in a later phase',
      'Existing booking and payment flows are unaffected'
    ];
  }
}
