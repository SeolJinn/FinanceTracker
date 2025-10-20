const API_BASE_URL = 'http://localhost:5000/api';

export interface FriendDto {
  id: number;
  friendUserId: number;
  email: string;
  displayName: string;
  nickname: string;
}

export interface AddFriendRequest {
  email: string;
  nickname?: string;
}

export interface UpdateFriendNicknameRequest {
  nickname: string;
}

export interface WalletDto {
  id: number;
  name: string;
  currencyCode: string;
  balance: number;
}

export interface FriendRequestDto {
  id: number;
  requesterUserId: number;
  receiverUserId: number;
  status: string;
  requestedNickname?: string;
  createdAt: string;
  requesterEmail: string;
  requesterName: string;
  receiverEmail: string;
  receiverName: string;
}

export interface CreateFriendRequest {
  email: string;
  nickname?: string;
}

class FriendService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw { message: errorData.message || 'An error occurred', errors: errorData.errors };
      } catch {
        throw { message: response.statusText || 'An error occurred' };
      }
    }
    try { return await response.json(); } catch { return undefined as unknown as T; }
  }

  async list(): Promise<FriendDto[]> {
    const res = await fetch(`${API_BASE_URL}/friends`, { headers: this.getAuthHeaders() });
    return this.handleResponse<FriendDto[]>(res);
  }

  async add(req: AddFriendRequest): Promise<FriendDto> {
    const res = await fetch(`${API_BASE_URL}/friends`, { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(req) });
    return this.handleResponse<FriendDto>(res);
  }

  async updateNickname(friendUserId: number, req: UpdateFriendNicknameRequest): Promise<FriendDto> {
    const res = await fetch(`${API_BASE_URL}/friends/${friendUserId}/nickname`, { method: 'PUT', headers: this.getAuthHeaders(), body: JSON.stringify(req) });
    return this.handleResponse<FriendDto>(res);
  }

  async remove(friendUserId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/friends/${friendUserId}`, { method: 'DELETE', headers: this.getAuthHeaders() });
    if (!res.ok) {
      try { const data = await res.json(); throw { message: data.message || 'An error occurred', errors: data.errors }; }
      catch { throw { message: res.statusText || 'An error occurred' }; }
    }
  }

  async listFriendWallets(friendUserId: number): Promise<WalletDto[]> {
    const res = await fetch(`${API_BASE_URL}/friends/${friendUserId}/wallets`, { headers: this.getAuthHeaders() });
    return this.handleResponse<WalletDto[]>(res);
  }

  // Friend request APIs
  async listIncomingRequests(): Promise<FriendRequestDto[]> {
    const res = await fetch(`${API_BASE_URL}/friends/requests/incoming`, { headers: this.getAuthHeaders() });
    return this.handleResponse<FriendRequestDto[]>(res);
  }

  async listOutgoingRequests(): Promise<FriendRequestDto[]> {
    const res = await fetch(`${API_BASE_URL}/friends/requests/outgoing`, { headers: this.getAuthHeaders() });
    return this.handleResponse<FriendRequestDto[]>(res);
  }

  async createRequest(req: CreateFriendRequest): Promise<FriendRequestDto> {
    const res = await fetch(`${API_BASE_URL}/friends/requests`, { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(req) });
    return this.handleResponse<FriendRequestDto>(res);
  }

  async acceptRequest(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/friends/requests/${id}/accept`, { method: 'POST', headers: this.getAuthHeaders() });
    if (!res.ok) {
      try { const data = await res.json(); throw { message: data.message || 'An error occurred', errors: data.errors }; }
      catch { throw { message: res.statusText || 'An error occurred' }; }
    }
  }

  async rejectRequest(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/friends/requests/${id}/reject`, { method: 'POST', headers: this.getAuthHeaders() });
    if (!res.ok) {
      try { const data = await res.json(); throw { message: data.message || 'An error occurred', errors: data.errors }; }
      catch { throw { message: res.statusText || 'An error occurred' }; }
    }
  }

  async cancelRequest(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/friends/requests/${id}/cancel`, { method: 'POST', headers: this.getAuthHeaders() });
    if (!res.ok) {
      try { const data = await res.json(); throw { message: data.message || 'An error occurred', errors: data.errors }; }
      catch { throw { message: res.statusText || 'An error occurred' }; }
    }
  }
}

export const friendService = new FriendService();


