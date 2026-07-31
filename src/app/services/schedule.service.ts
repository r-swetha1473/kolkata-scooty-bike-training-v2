import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { firstValueFrom } from 'rxjs';

export interface ScheduleVehicleCapacity {
  vehicle_id: string;
  vehicle_name: string;
  capacity: number;
  booked: number;
  remaining?: number;
}

export interface ScheduleWindow {
  id?: string;
  slot_id?: string;
  start_time: string;
  end_time: string;
  slot_date?: string;
  branch_id: string;
  status: 'available' | 'full' | 'disabled';
  capacity: number;
  booked_count: number;
  remaining_capacity: number;
  trainer_id?: string | null;
  trainer_name?: string | null;
  vehicle_capacities?: ScheduleVehicleCapacity[];
  disabled_reason?: string | null;
  unavailable_reason?: string | null;
  reason?: string | null;
  bookable?: boolean;
  is_virtual?: boolean;
  capacity_source?: string;
}

export interface BranchScheduleContext {
  branch: { id: string; name: string; slug: string; is_active: boolean };
  working_hours: Record<string, unknown> | null;
  slot_duration_minutes: number;
  default_capacity: number;
  computed_capacity: number;
  vehicles: Array<{ id: string; name: string; max_per_slot: number; operational_status: string }>;
  trainers: Array<{ id: string; full_name: string; is_active: boolean }>;
  holidays: Array<{ id: string; holiday_date: string; reason?: string }>;
  exceptions_count: number;
  is_closed: boolean;
  closed_reason?: string | null;
}

export interface ScheduleTimelineResponse {
  slots: ScheduleWindow[];
  all_slots?: ScheduleWindow[];
  meta: {
    branch_id: string;
    date: string;
    engine: string;
    generated: number;
    returned: number;
    filtered: number;
    total: number;
    response_ms: number;
  };
  branch_context: BranchScheduleContext;
}

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  constructor(private http: HttpService) {}

  getTimeline(params: {
    branchId: string;
    date: string;
    vehicleId?: string;
    trainerId?: string;
    status?: string;
    search?: string;
  }): Promise<ScheduleTimelineResponse> {
    const qs = new URLSearchParams({
      branch_id: params.branchId,
      date: params.date
    });
    if (params.vehicleId) qs.set('vehicle_id', params.vehicleId);
    if (params.trainerId) qs.set('trainer_id', params.trainerId);
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    return firstValueFrom(this.http.get<ScheduleTimelineResponse>(`/schedule/timeline?${qs}`));
  }

  disableWindow(payload: {
    branch_id: string;
    date: string;
    start_time: string;
    end_time: string;
    reason?: string;
  }) {
    return firstValueFrom(this.http.post('/schedule/disable', payload));
  }

  enableWindow(payload: {
    branch_id: string;
    date: string;
    start_time: string;
    end_time: string;
  }) {
    return firstValueFrom(this.http.post('/schedule/enable', payload));
  }

  overrideCapacity(payload: {
    branch_id: string;
    date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    vehicle_id?: string | null;
    reason?: string;
  }) {
    return firstValueFrom(this.http.post('/schedule/capacity-override', payload));
  }

  assignTrainer(payload: {
    branch_id: string;
    date: string;
    start_time: string;
    end_time: string;
    trainer_id?: string | null;
  }) {
    return firstValueFrom(this.http.put('/schedule/trainer', payload));
  }

  updateNotes(payload: {
    branch_id: string;
    date: string;
    start_time: string;
    end_time: string;
    reason: string;
  }) {
    return firstValueFrom(this.http.put('/schedule/notes', payload));
  }

  bulkDisable(payload: {
    branch_id: string;
    date: string;
    windows: Array<{ start_time: string; end_time: string }>;
    reason?: string;
  }) {
    return firstValueFrom(this.http.post('/schedule/bulk-disable', payload));
  }

  async exportCsv(branchId: string, date: string): Promise<Blob> {
    return firstValueFrom(
      this.http.getBlob(`/schedule/export?branch_id=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`)
    );
  }
}
