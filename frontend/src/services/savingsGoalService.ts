const API_BASE_URL = 'http://localhost:5000/api';

export interface SavingsGoalRequest {
  targetAmount: number;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
}

export interface SavingsGoalResponse {
  id: number;
  userId: number;
  targetAmount: number;
  startDate: string; // ISO
  targetDate: string; // ISO
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

  async get(): Promise<SavingsGoalResponse | null> {
    const response = await fetch(`${API_BASE_URL}/savingsgoal`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (response.status === 404) return null;
    return this.handleResponse<SavingsGoalResponse>(response);
  }

  async upsert(goal: SavingsGoalRequest): Promise<SavingsGoalResponse> {
    const response = await fetch(`${API_BASE_URL}/savingsgoal`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(goal),
    });
    return this.handleResponse<SavingsGoalResponse>(response);
  }

  async delete(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/savingsgoal`, {
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


