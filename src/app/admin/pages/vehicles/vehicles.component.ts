import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Branch, BranchService } from '../../../services/branch.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';

interface Vehicle {
  id: string;
  name: string;
  max_per_slot: number;
  is_active: boolean;
  branch_id?: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-admin-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminModalComponent],
  template: `
    <div class="vehicles-page admin-page">
      <div class="admin-sticky-toolbar">
      <header class="admin-hero">
        <div>
          <h1>Vehicles</h1>
          <p>Manage training vehicles and per-slot capacity limits.</p>
        </div>
        <div class="admin-hero-actions">
          <button class="admin-btn admin-btn-primary" (click)="showCreateModal()">Add vehicle</button>
        </div>
      </header>

      <div class="admin-filters-bar">
        <div class="admin-filters-content">
          <div class="admin-filter-group admin-search-group">
            <svg class="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              type="text" 
              [(ngModel)]="searchTerm" 
              (input)="filterVehicles()"
              placeholder="Search vehicle name..." 
              class="admin-search-input">
          </div>
          <div class="admin-filter-group">
            <select [(ngModel)]="statusFilter" (change)="filterVehicles()" class="admin-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4,5]"></div>
      </div>

      <div class="admin-table-container admin-table-sticky" *ngIf="!loading">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Branch</th>
              <th>Max Per Slot</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let vehicle of getPaginatedVehicles()">
              <td><strong>{{ vehicle.name }}</strong></td>
              <td>{{ branchName(vehicle.branch_id) }}</td>
              <td>{{ vehicle.max_per_slot }}</td>
              <td>
                <span class="admin-badge" [class.admin-badge-success]="vehicle.is_active" [class.admin-badge-danger]="!vehicle.is_active">
                  {{ vehicle.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>{{ formatDate(vehicle.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <button
                    type="button"
                    class="admin-action-btn"
                    (click)="showEditModal(vehicle)"
                    title="Edit">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="admin-action-btn"
                    (click)="toggleActive(vehicle.id, vehicle.is_active)"
                    [title]="vehicle.is_active ? 'Deactivate' : 'Activate'">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="vehicle.is_active">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="!vehicle.is_active">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="admin-action-btn danger"
                    (click)="confirmDelete(vehicle)"
                    title="Delete"
                    [disabled]="vehicle.is_active">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="getPaginatedVehicles().length === 0" class="admin-empty-state">
          <h3>No vehicles found</h3>
          <p>Try another search or add a new vehicle.</p>
          <button type="button" class="admin-btn admin-btn-primary" (click)="showCreateModal()">Add vehicle</button>
        </div>
      </div>

      <app-admin-pagination
        *ngIf="filteredVehicles.length > 0"
        [currentPage]="currentPage"
        [totalPages]="getTotalPages()"
        [totalRecords]="filteredVehicles.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="vehicles"
        (pageChange)="currentPage = $event"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <app-admin-modal
        #vehicleModal
        [open]="showModal"
        [title]="editingVehicle ? 'Edit vehicle' : 'Add vehicle'"
        subtitle="Set name and max bookings per slot."
        [dirty]="formDirty"
        (closed)="closeModal()">
        <form (ngSubmit)="saveVehicle()" id="vehicle-form">
          <label class="form-group">
            <span>Vehicle name</span>
            <input type="text" [(ngModel)]="formVehicle.name" name="name" placeholder="e.g. Electric Scooty" required class="admin-input" (ngModelChange)="formDirty = true">
          </label>
          <label class="form-group">
            <span>Branch</span>
            <select [(ngModel)]="formVehicle.branch_id" name="branch_id" required class="admin-select" (ngModelChange)="formDirty = true">
              <option value="">Select branch</option>
              <option *ngFor="let b of branches" [value]="b.id">{{ b.name }}</option>
            </select>
          </label>
          <label class="form-group">
            <span>Max per slot</span>
            <input type="number" [(ngModel)]="formVehicle.max_per_slot" name="max_per_slot" min="1" max="10" required class="admin-input" (ngModelChange)="formDirty = true">
            <small>Maximum bookings of this vehicle type per slot (feeds branch slot capacity)</small>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" [(ngModel)]="formVehicle.is_active" name="is_active" (ngModelChange)="formDirty = true">
            <span>Active (available for bookings)</span>
          </label>
        </form>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="vehicleModal.requestClose()">Cancel</button>
          <button type="submit" form="vehicle-form" class="admin-btn admin-btn-primary">Save</button>
        </div>
      </app-admin-modal>

      <app-admin-modal
        [open]="showDeleteModal"
        title="Delete vehicle"
        [subtitle]="vehicleToDelete?.name || ''"
        [dirty]="false"
        size="sm"
        (closed)="showDeleteModal = false">
        <p *ngIf="vehicleToDelete?.is_active" class="admin-badge admin-badge-warning">Deactivate this vehicle before deleting.</p>
        <p *ngIf="!vehicleToDelete?.is_active">This action cannot be undone.</p>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="showDeleteModal = false">Cancel</button>
          <button type="button" class="admin-btn admin-btn-danger" (click)="deleteVehicle()" [disabled]="vehicleToDelete?.is_active">Delete</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .admin-data-table { min-width: 640px; }
  `]
})
export class AdminVehiclesComponent implements OnInit {
  loading = false;
  vehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  searchTerm = '';
  statusFilter = 'all';
  currentPage = 1;
  itemsPerPage = 10;
  showModal = false;
  formDirty = false;
  showDeleteModal = false;
  editingVehicle: Vehicle | null = null;
  vehicleToDelete: Vehicle | null = null;

  formVehicle: Partial<Vehicle> = {
    name: '',
    max_per_slot: 1,
    is_active: true,
    branch_id: ''
  };
  branches: Branch[] = [];

  constructor(
    private api: ApiService,
    private branchService: BranchService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadVehicles(), this.loadBranches()]);
  }

  async loadBranches() {
    try {
      this.branches = await this.branchService.list(false);
    } catch {
      this.branches = [];
    }
  }

  branchName(branchId?: string): string {
    if (!branchId) return '—';
    return this.branches.find((b) => b.id === branchId)?.name || '—';
  }

  async loadVehicles() {
    try {
      const result = await this.api.get<Vehicle[]>('/vehicles?include_inactive=true');
      this.vehicles = Array.isArray(result) ? result : [];
      this.filterVehicles();
    } catch (error: unknown) {
      this.toast.error(getApiErrorMessage(error, 'Failed to load vehicles'));
    }
  }

  filterVehicles() {
    let filtered = [...this.vehicles];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(v => v.is_active);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(v => !v.is_active);
    }

    this.filteredVehicles = filtered;
    this.currentPage = 1;
  }

  getPaginatedVehicles(): Vehicle[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredVehicles.slice(start, end);
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredVehicles.length / this.itemsPerPage));
  }

  onPageSizeChange(size: number) {
    this.itemsPerPage = size || 10;
    this.currentPage = 1;
  }

  showCreateModal() {
    this.editingVehicle = null;
    this.formVehicle = {
      name: '',
      max_per_slot: 1,
      is_active: true,
      branch_id: this.branches[0]?.id || ''
    };
    this.formDirty = false;
    this.showModal = true;
  }

  showEditModal(vehicle: Vehicle) {
    this.editingVehicle = vehicle;
    this.formVehicle = {
      name: vehicle.name,
      max_per_slot: vehicle.max_per_slot,
      is_active: vehicle.is_active,
      branch_id: vehicle.branch_id || ''
    };
    this.formDirty = false;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingVehicle = null;
    this.formDirty = false;
    this.formVehicle = {
      name: '',
      max_per_slot: 1,
      is_active: true,
      branch_id: ''
    };
  }

  private buildVehiclePayload(): { name: string; max_per_slot: number; is_active: boolean; branch_id: string } {
    const name = (this.formVehicle.name || '').trim();
    const maxPerSlot = parseInt(String(this.formVehicle.max_per_slot ?? ''), 10);
    const branchId = String(this.formVehicle.branch_id || '');

    if (!name) {
      throw new Error('Vehicle name is required');
    }
    if (!branchId) {
      throw new Error('Branch is required');
    }
    if (!Number.isFinite(maxPerSlot) || maxPerSlot < 1) {
      throw new Error('Max per slot must be at least 1');
    }

    return {
      name,
      max_per_slot: maxPerSlot,
      is_active: Boolean(this.formVehicle.is_active),
      branch_id: branchId
    };
  }

  async saveVehicle() {
    try {
      const payload = this.buildVehiclePayload();

      if (this.editingVehicle) {
        await this.api.put(`/vehicles/${this.editingVehicle.id}`, payload);
        this.toast.success('Vehicle updated successfully');
      } else {
        await this.api.post('/vehicles', payload);
        this.toast.success('Vehicle created successfully');
      }
      this.closeModal();
      await this.loadVehicles();
    } catch (error: unknown) {
      if (error instanceof Error && !('error' in error)) {
        this.toast.error(error.message);
        return;
      }
      this.toast.error(getApiErrorMessage(error, 'Failed to save vehicle'));
    }
  }

  async toggleActive(id: string, currentStatus: boolean) {
    try {
      await this.api.put(`/vehicles/${id}`, { is_active: !currentStatus });
      this.toast.success(`Vehicle ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await this.loadVehicles();
    } catch (error: unknown) {
      this.toast.error(getApiErrorMessage(error, 'Failed to update vehicle status'));
    }
  }

  confirmDelete(vehicle: Vehicle) {
    this.vehicleToDelete = vehicle;
    this.showDeleteModal = true;
  }

  async deleteVehicle() {
    if (!this.vehicleToDelete) return;

    try {
      await this.api.delete(`/vehicles/${this.vehicleToDelete.id}`);
      this.toast.success('Vehicle deleted successfully');
      this.showDeleteModal = false;
      this.vehicleToDelete = null;
      await this.loadVehicles();
    } catch (error: unknown) {
      this.toast.error(getApiErrorMessage(error, 'Failed to delete vehicle'));
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}
