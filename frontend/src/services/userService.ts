import { authService } from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003/api';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'qc_user' | 'upload_user' | 'supervisor';
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  is_active: boolean;
  is_google_user: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password?: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

export interface UpdateUserData {
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
}

export interface UserStats {
  roleStats: {
    role: string;
    count: number;
    active_count: number;
    google_users: number;
  }[];
  totalStats: {
    total_users: number;
    active_users: number;
    recent_logins: number;
  };
}

class UserService {
  private getHeaders() {
    return authService.getAuthHeaders();
  }

  async getAllUsers(): Promise<{ users: User[] }> {
    const response = await fetch(`${API_URL}/users`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }

    return response.json();
  }

  async createUser(userData: CreateUserData): Promise<{ message: string; user: User }> {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }

    return response.json();
  }

  async updateUser(userId: number, userData: UpdateUserData): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }

    return response.json();
  }

  async deleteUser(userId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }

    return response.json();
  }

  async resetUserPassword(userId: number, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }

    return response.json();
  }

  async getUserStats(): Promise<UserStats> {
    const response = await fetch(`${API_URL}/users/stats`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user statistics');
    }

    return response.json();
  }
}

export const userService = new UserService();