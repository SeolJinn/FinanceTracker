const API_BASE_URL = 'http://localhost:5000/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresAt: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

class AuthService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json();
      throw {
        message: errorData.message || 'An error occurred',
        errors: errorData.errors
      } as ApiError;
    }
    return response.json();
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const result = await this.handleResponse<AuthResponse>(response);
    
    // Store token in localStorage
    localStorage.setItem('authToken', result.token);
    localStorage.setItem('tokenExpiry', result.expiresAt);
    localStorage.setItem('user', JSON.stringify({
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName
    }));

    return result;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const result = await this.handleResponse<AuthResponse>(response);
    
    // Store token in localStorage
    localStorage.setItem('authToken', result.token);
    localStorage.setItem('tokenExpiry', result.expiresAt);
    localStorage.setItem('user', JSON.stringify({
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName
    }));

    return result;
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getTokenExpiry(): Date | null {
    const expiry = localStorage.getItem('tokenExpiry');
    return expiry ? new Date(expiry) : null;
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    const expiry = this.getTokenExpiry();
    
    if (!token || !expiry) {
      return false;
    }
    
    return new Date() < expiry;
  }

  isAuthenticated(): boolean {
    return this.isTokenValid();
  }
}

export const authService = new AuthService();