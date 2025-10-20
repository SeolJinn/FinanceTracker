const API_BASE_URL = 'http://localhost:5000/api';

export interface CreateSavingsGoalRequest {
  walletId: number;
  targetAmount: number;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  title?: string;
}

export interface UpdateSavingsGoalRequest {
  targetAmount?: number;
  startDate?: string; // YYYY-MM-DD
  targetDate?: string; // YYYY-MM-DD
  title?: string;
}

export interface SavingsGoalResponse {
  id: number;
  userId: number;
  walletId: number;
  targetAmount: number;
  startDate: string; // ISO
  targetDate: string; // ISO
  title?: string;
  createdAt: string;
  updatedAt: string;
}

class SavingsGoalService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let message = 'An error occurred';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {}
      throw new Error(message);
    }
    return response.json();
  }

  async list(walletId?: number): Promise<SavingsGoalResponse[]> {
    const url = new URL(`${API_BASE_URL}/savingsgoal`);
    if (walletId != null) url.searchParams.set('walletId', String(walletId));
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<SavingsGoalResponse[]>(response);
  }

  async create(goal: CreateSavingsGoalRequest): Promise<SavingsGoalResponse> {
    const response = await fetch(`${API_BASE_URL}/savingsgoal`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(goal),
    });
    return this.handleResponse<SavingsGoalResponse>(response);
  }

  async getById(id: number): Promise<SavingsGoalResponse> {
    const response = await fetch(`${API_BASE_URL}/savingsgoal/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<SavingsGoalResponse>(response);
  }

  async update(id: number, goal: UpdateSavingsGoalRequest): Promise<SavingsGoalResponse> {
    const response = await fetch(`${API_BASE_URL}/savingsgoal/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(goal),
    });
    return this.handleResponse<SavingsGoalResponse>(response);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/savingsgoal/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok && response.status !== 404) {
      let message = 'Failed to delete savings goal';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {}
      throw new Error(message);
    }
  }
}

export const savingsGoalService = new SavingsGoalService();


