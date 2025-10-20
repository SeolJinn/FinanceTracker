const API_BASE_URL = 'http://localhost:5000/api';

export enum TransactionType {
  Expense = 0,
  Income = 1
}

export enum CategoryType {
  Expense = 0,
  Income = 1
}

export interface CreateTransactionRequest {
  amount: number;
  type: TransactionType;
  categoryId: number;
  walletId: number;
  date: string;
  note?: string;
}

export interface UpdateTransactionRequest {
  amount?: number;
  type?: TransactionType;
  categoryId?: number;
  walletId?: number;
  date?: string;
  note?: string;
}

export interface TransactionResponse {
  id: number;
  userId: number;
  amount: number;
  type: TransactionType;
  categoryId: number;
  categoryName: string;
  walletId: number;
  walletCurrency: string;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

class TransactionService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

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

  async createTransaction(transaction: CreateTransactionRequest): Promise<TransactionResponse> {
    const response = await fetch(`${API_BASE_URL}/transaction`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(transaction),
    });

    return this.handleResponse<TransactionResponse>(response);
  }

  async getTransactions(
    startDate?: string,
    endDate?: string,
    type?: TransactionType,
    walletId?: number
  ): Promise<TransactionResponse[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (type !== undefined) params.append('type', type.toString());
    if (walletId !== undefined) params.append('walletId', walletId.toString());

    const response = await fetch(`${API_BASE_URL}/transaction?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<TransactionResponse[]>(response);
  }

  async getTransaction(id: number): Promise<TransactionResponse> {
    const response = await fetch(`${API_BASE_URL}/transaction/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<TransactionResponse>(response);
  }

  async updateTransaction(id: number, transaction: UpdateTransactionRequest): Promise<TransactionResponse> {
    const response = await fetch(`${API_BASE_URL}/transaction/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(transaction),
    });

    return this.handleResponse<TransactionResponse>(response);
  }

  async deleteTransaction(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/transaction/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw {
        message: errorData.message || 'An error occurred',
        errors: errorData.errors
      } as ApiError;
    }
  }

  async getCategories(type?: CategoryType): Promise<Category[]> {
    const params = new URLSearchParams();
    if (type !== undefined) params.append('type', type.toString());

    const response = await fetch(`${API_BASE_URL}/transaction/categories?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<Category[]>(response);
  }
}

export const transactionService = new TransactionService();