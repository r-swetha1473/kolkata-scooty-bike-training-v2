import { RouterLink } from '@angular/router';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SettingsService, SiteSettings } from '../../services/settings.service';
import { Branch, BranchService } from '../../services/branch.service';
import { CmsContentService } from '../../services/cms-content.service';
import { ToastService } from '../../services/toast.service';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';
import { FaqItem } from '../../shared/components/faq-accordion/faq-accordion.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, FaqAccordionComponent, RouterLink],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit, OnDestroy {
  formData = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  };

  contactInfo: { icon: string; title: string; value: string; link: string }[] = [];
  settings: SiteSettings | null = null;
  branches: Branch[] = [];
  branchesLoading = true;
  faqs: FaqItem[] = [];
  whatsappUrl = '';
  mapsUrl = '';
  private subs: Subscription[] = [];

  constructor(
    private settingsService: SettingsService,
    private branchService: BranchService,
    private cms: CmsContentService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.subs.push(
      this.settingsService.settings$.subscribe((settings) => {
        this.settings = settings;
        this.whatsappUrl = this.cms.whatsappUrl(settings);
        this.mapsUrl = this.cms.mapsUrl(settings);
        this.updateContactInfo();
      }),
      this.cms.contactFaqs$().subscribe((faqs) => (this.faqs = faqs))
    );

    this.branchService.list(true).then((rows) => {
      this.branches = rows;
    }).finally(() => {
      this.branchesLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  updateContactInfo() {
    if (!this.settings) return;
    this.contactInfo = [
      { icon: 'phone', title: 'Phone', value: this.settings.contact_phone, link: `tel:${this.settings.contact_phone}` },
      { icon: 'whatsapp', title: 'WhatsApp', value: this.settings.contact_whatsapp || this.settings.contact_phone, link: this.whatsappUrl },
      { icon: 'email', title: 'Email', value: this.settings.contact_email, link: `mailto:${this.settings.contact_email}` },
      { icon: 'location', title: 'Location', value: this.settings.contact_address, link: this.mapsUrl },
      { icon: 'hours', title: 'Hours', value: this.settings.contact_working_hours || 'Mon–Sat: 9 AM – 9 PM', link: this.mapsUrl }
    ];
  }

  get socialLinks() {
    if (!this.settings) return [];
    const links = [];
    if (this.settings.social_facebook) links.push({ name: 'Facebook', url: this.settings.social_facebook });
    if (this.settings.social_instagram) links.push({ name: 'Instagram', url: this.settings.social_instagram });
    if (this.settings.social_youtube) links.push({ name: 'YouTube', url: this.settings.social_youtube });
    return links;
  }

  onSubmit() {
    if (this.formData.name && this.formData.email && this.formData.message) {
      this.toast.success('Thank you! We will contact you soon.');
      this.formData = { name: '', email: '', phone: '', subject: '', message: '' };
    }
  }
}
