export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'qc_user' | 'upload_user' | 'supervisor';
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface GoogleCredential {
  credential: string;
}

export interface ApiError {
  error: string;
  required?: string[];
  current?: string;
}