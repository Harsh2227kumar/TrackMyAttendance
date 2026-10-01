export type UserRole = 'STUDENT' | 'ORGANISER' | 'ADMIN';

export interface CurrentUser {
  id: string;
  role: UserRole;
  name: string;
  username: string;
  prn?: string;
  email?: string;
  semester?: number;
  section?: string;
  is_universal?: boolean;
}

export interface Student {
  id: string;
  prn: string;
  name: string;
  semester: number;
  section: string;
  username: string;
  password_hash?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface EventRecord {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  description?: string;
  organiser_id: string;
  organiser_name: string;
  status: 'draft' | 'submitted';
  student_count: number;
  created_at: string;
  updated_at?: string;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  student_id: string;
  prn: string;
  student_name: string;
  semester: number;
  section: string;
  current_attendance_percentage: number;
  created_at: string;
}

export interface AttendanceRequestItem {
  id: string;
  date: string;
  dates?: string[];
  start_time: string;
  end_time: string;
  event_title: string;
  subject_id: string;
  subject_name: string;
  faculty_id: string;
  faculty_name: string;
  reason: string;
  status?: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
}

export interface AttendanceRequest {
  id: string;
  student_id: string;
  student_prn: string;
  student_name: string;
  semester: number;
  section: string;
  current_attendance_percentage?: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'partially_approved';
  admin_comment?: string;
  items: AttendanceRequestItem[];
  created_at: string;
  updated_at?: string;
  submitted_by?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
}

export interface ReportFilterCriteria {
  semester: number | 'ALL';
  section: string | 'ALL';
  faculty_name: string;
  subject_name: string;
  event_title: string;
  date_from: string;
  date_to: string;
  prn: string;
  student_name: string;
  has_attendance_request?: boolean | 'ALL';
  request_status?: 'ALL' | 'ANY_REQUEST' | 'pending' | 'approved' | 'rejected' | 'partially_approved' | 'NONE';
  attendance_operator: 'ALL' | 'gte_75' | 'lt_75' | 'between' | 'not_entered' | 'entered' | 'custom_min' | 'custom_max';
  custom_min?: number;
  custom_max?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface ReportRow {
  id: string;
  prn: string;
  student_name: string;
  semester: number;
  section: string;
  event_title: string;
  date: string;
  time: string;
  current_attendance_percentage?: number | null;
  faculty_name?: string;
  subject_name?: string;
  organiser_name?: string;
  venue?: string;
  request_status?: 'pending' | 'approved' | 'rejected' | 'partially_approved' | 'none';
  request_id?: string;
  request_reason?: string;
  admin_comment?: string;
  requested_item_count?: number;
  source_type?: 'event_attendance' | 'attendance_request';
}
