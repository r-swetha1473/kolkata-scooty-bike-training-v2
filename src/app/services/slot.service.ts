import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';

export interface Slot {
  id: string;
  trainer_id?: string;
  start_time: string;
  end_time: string;
  slot_date: string;
  capacity: number;
  booked_count: number;
  /** Active vehicle capacity from API (matches server validation). */
  live_capacity?: number;
  /** Seats still available (capacity - booked). Prefer this for customer UI. */
  remaining_capacity?: number;
  capacity_exceeded?: boolean;
  status: 'available' | 'full' | 'cancelled' | 'completed' | 'disabled';
  is_auto_generated: boolean;
  created_at: string;
  updated_at: string;
  duration_minutes?: number;
  /** Per-vehicle rows from API (preferred over legacy electric_* fields) */
  vehicle_capacities?: Array<{
    vehicle_id: string;
    vehicle_name: string;
    capacity: number;
    booked: number;
  }>;
  electric_capacity?: number;
  petrol_capacity?: number;
  bike_capacity?: number;
  electric_booked?: number;
  petrol_booked?: number;
  bike_booked?: number;
  trainer?: {
    id: string;
    profile: {
      full_name: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class SlotService {
  private apiUrl = environment.apiUrl || 'https://kolkata-scooty-bike-training.onrender.com/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = getAuthToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }

  async generateDailySlots(date?: string, force?: boolean, branchId?: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(
        `${this.apiUrl}/slots/generate`,
        { date, force, branch_id: branchId },
        { headers: this.getAuthHeaders() }
      )
    );
  }

  /**
   * Load slots for a date.
   * With branchId: prefer scheduling engine (`/availability?full_day=true`) so capacity
   * matches Admin Schedule (branch vehicle sum), not stale global slot rows.
   */
  async getSlotsByDate(
    date: string,
    options?: { bookableOnly?: boolean; branchId?: string; vehicleId?: string }
  ): Promise<Slot[]> {
    if (options?.branchId) {
      const slots = await this.getAvailability(date, options.branchId, options.vehicleId, {
        fullDay: options.bookableOnly !== true
      });
      if (options?.bookableOnly === true) {
        return slots.filter((s) => (s as any).bookable !== false && this.remainingOf(s) > 0);
      }
      return slots;
    }
    const params = new URLSearchParams();
    if (options?.bookableOnly === true) params.set('bookable_only', 'true');
    const q = params.toString() ? `?${params}` : '';
    return firstValueFrom(
      this.http.get<Slot[]>(`${this.apiUrl}/slots/date/${date}${q}`)
    );
  }

  private remainingOf(slot: Slot): number {
    if (slot.remaining_capacity != null) return Math.max(0, Number(slot.remaining_capacity));
    const cap = Number(slot.live_capacity ?? slot.capacity ?? 0);
    return Math.max(0, cap - Number(slot.booked_count || 0));
  }

  /** Dynamic scheduling engine — branch-aware availability (preferred for booking). */
  async getAvailability(
    date: string,
    branchId: string,
    vehicleId?: string,
    opts?: { fullDay?: boolean }
  ): Promise<Slot[]> {
    const params = new URLSearchParams({ branch_id: branchId, date });
    if (vehicleId) params.set('vehicle_id', vehicleId);
    if (opts?.fullDay) params.set('full_day', 'true');
    return firstValueFrom(
      this.http.get<Slot[]>(`${this.apiUrl}/availability?${params}`)
    );
  }

  async getSlotsByDateRange(startDate: string, endDate: string): Promise<Slot[]> {
    // Format dates to include full day range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    // Use the base route with query parameters as it already supports start_date and end_date
    return firstValueFrom(
      this.http.get<Slot[]>(`${this.apiUrl}/slots?start_date=${start.toISOString()}&end_date=${end.toISOString()}`)
    );
  }

  async getAvailableSlots(date?: string): Promise<Slot[]> {
    const url = date 
      ? `${this.apiUrl}/slots/available?date=${date}`
      : `${this.apiUrl}/slots/available`;
    return firstValueFrom(this.http.get<Slot[]>(url));
  }

  async getSlotById(id: string): Promise<Slot | null> {
    try {
      return await firstValueFrom(
        this.http.get<Slot>(`${this.apiUrl}/slots/${id}`)
      );
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async createSlot(slot: Partial<Slot>): Promise<Slot> {
    return firstValueFrom(
      this.http.post<Slot>(`${this.apiUrl}/slots`, slot, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async updateSlot(id: string, updates: Partial<Slot>): Promise<Slot> {
    return firstValueFrom(
      this.http.put<Slot>(`${this.apiUrl}/slots/${id}`, updates, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async assignTrainer(slotId: string, trainerId: string): Promise<Slot> {
    return firstValueFrom(
      this.http.put<Slot>(`${this.apiUrl}/slots/${slotId}/trainer`, { trainer_id: trainerId }, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async unassignTrainer(slotId: string): Promise<Slot> {
    return firstValueFrom(
      this.http.put<Slot>(`${this.apiUrl}/slots/${slotId}/trainer`, { trainer_id: null }, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async updateSlotStatus(slotId: string, status: 'available' | 'cancelled' | 'full' | 'completed'): Promise<Slot> {
    return firstValueFrom(
      this.http.put<Slot>(`${this.apiUrl}/slots/${slotId}/status`, { status }, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async deleteSlot(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiUrl}/slots/${id}`, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async deleteSlotsByDate(date: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiUrl}/slots/date/${date}`, {
        headers: this.getAuthHeaders()
      })
    );
  }

  // PHASE 3: Get next available date without slots
  async getNextAvailableDate(startDate?: string): Promise<{ success: boolean; nextAvailableDate: string | null; daysAhead?: number }> {
    const params = startDate ? { start_date: startDate } : {};
    return firstValueFrom(
      this.http.get<{ success: boolean; nextAvailableDate: string | null; daysAhead?: number }>(
        `${this.apiUrl}/slots/next-available-date`,
        { params, headers: this.getAuthHeaders() }
      )
    );
  }

  /** vehicleCapacities: map of vehicle UUID -> capacity */
  async updateVehicleCapacity(slotId: string, vehicleCapacities: Record<string, number>): Promise<Slot> {
    return firstValueFrom(
      this.http.put<Slot>(`${this.apiUrl}/slots/${slotId}/vehicle-capacity`, { vehicle_capacities: vehicleCapacities }, {
        headers: this.getAuthHeaders()
      })
    );
  }
}
