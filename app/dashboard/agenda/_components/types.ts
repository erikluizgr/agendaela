export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface Client {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  total_appointments: number
  total_spent: number
  last_appointment_at: string | null
}

export interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  color: string
  is_active: boolean
}

export interface Appointment {
  id: string
  profile_id: string
  client_id: string | null
  service_id: string | null
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  notes: string | null
  price: number | null
  reminder_sent: boolean
  client?: Client | null
  service?: Service | null
}

export interface WorkingHour {
  id: string
  profile_id: string
  day_of_week: number // 0=Dom, 1=Seg, ... 6=Sáb
  start_time: string  // 'HH:MM:SS'
  end_time: string
  break_start: string | null
  break_end: string | null
  is_active: boolean
}
