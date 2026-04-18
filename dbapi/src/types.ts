export interface Env {
  SUPABASE_PROJECT_URL: string;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_AUDIENCE?: string;
}

export interface ApiError {
  code: number;
  message: string;
}

export interface AuthContext {
  token: string;
  userId: string;
  memberId?: string;
  roles: string[];
  claims: Record<string, unknown>;
}

export interface MemberCreateRequest {
  name: string;
  grade: number;
  emergency_contact: string;
  student_id: string;
  student_email: string;
  insurance?: boolean;
  some_allergy?: boolean;
}

export interface MemberUpdateRequest {
  name?: string;
  grade?: number;
  emergency_contact?: string;
  student_id?: string;
  student_email?: string;
  insurance?: boolean;
  some_allergy?: boolean;
}
