import type { CreateUserRequest, LoginRequest, AuthResponse, User } from '@shared/types';
import { apiGet, apiPost, apiPut } from './api';

export class AuthService {
  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    const response = await apiPost<AuthResponse>('/auth/register', userData);
    
    // Store token and user data
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiPost<AuthResponse>('/auth/login', credentials);
    
    // Store token and user data
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async getProfile(): Promise<User> {
    return apiGet<User>('/auth/profile');
  }

  async updateProfile(updates: Partial<Pick<User, 'name' | 'email'>>): Promise<User> {
    const response = await apiPut<User>('/auth/profile', updates);
    
    // Update stored user data
    localStorage.setItem('user', JSON.stringify(response));
    
    return response;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

export const authService = new AuthService();