import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {
  milestones = [
    { year: '2014', title: 'Opened doors' },
    { year: '2016', title: 'More centres' },
    { year: '2019', title: 'State recognition' },
    { year: '2023', title: 'Online booking' }
  ];

  values = [
    {
      title: 'Excellence',
      line: 'Every session is structured, safe, and held to the highest coaching standard.',
      icon: 'star'
    },
    {
      title: 'Integrity',
      line: 'Honest guidance, transparent pricing, and respect for every learner.',
      icon: 'shield'
    },
    {
      title: 'Innovation',
      line: 'Modern training methods, flexible scheduling, and practical road confidence.',
      icon: 'spark'
    },
    {
      title: 'Care',
      line: 'Patient, women-friendly coaching designed for beginners and professionals alike.',
      icon: 'heart'
    }
  ];

  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.setPage({
      title: 'About Us',
      description:
        'Learn about Kolkata Scooty Bike Training — a women-friendly riding school focused on safety, confidence, and professional scooty and bike coaching in Kolkata.',
      path: '/about',
      keywords: 'about Kolkata Scooty, two wheeler training Kolkata, women friendly bike training'
    });
    this.seo.setBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' }
    ]);
    this.seo.setOrganizationSchema();
  }
}
