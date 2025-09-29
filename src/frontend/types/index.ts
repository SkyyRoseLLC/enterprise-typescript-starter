// Re-export shared types
export * from '@shared/types';

// Frontend-specific types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: CreateUserRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email'>>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// (Removed duplicate User, CreateUserRequest, and LoginRequest interfaces; use those from @shared/types)
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea';
  placeholder?: string;
  required?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    message?: string;
  };
}