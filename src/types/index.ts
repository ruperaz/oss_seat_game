export interface Submission {
  id: number;
  title: string;
  filler_name: string;
  notes?: string;
  total_assigned: number;
  total_seats: number;
  created_at: string;
  updated_at: string;
  actual_assigned_count?: number;
  assignments?: Record<string, string>;
}

export interface SeatAssignment {
  seat_code: string;
  person_name: string;
  assigned_at?: string;
}

export interface Person {
  id: number;
  name: string;
  created_at?: string;
}

export interface GlobalStats {
  totalSubmissions: number;
  totalSeatAssignments: number;
  uniqueFillers: number;
  mostPopularSeats: Array<{ seat_code: string; count: number }>;
  recentSubmissions: Array<{
    id: number;
    title: string;
    filler_name: string;
    total_assigned: number;
    created_at: string;
  }>;
}

export type ViewTab = 'map' | 'database' | 'people' | 'analytics';
