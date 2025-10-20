const API_BASE_URL = 'http://localhost:5000/api';

export interface PeerPaymentRequestDto {
  id: number;
  requesterUserId: number;
  payerUserId: number;
  targetWalletId: number;
  amount: number;
  note?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePeerPaymentRequest {
  payerUserId: number;
  targetWalletId: number;
  amount: number;
  note?: string;
}

export interface AcceptPeerPaymentRequest {
  fromWalletId: number;
  rate?: number;
}

export interface SendPeerPaymentRequest {
  recipientUserId: number;
  targetWalletId: number;
  fromWalletId: number;
  amount: number;
  rate?: number;
  note?: string;
}

class PeerPaymentService {
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

  async listIncoming(): Promise<PeerPaymentRequestDto[]> {
    const res = await fetch(`${API_BASE_URL}/peerpayments/incoming`, { headers: this.getAuthHeaders() });
    return this.handleResponse<PeerPaymentRequestDto[]>(res);
  }

  async listOutgoing(): Promise<PeerPaymentRequestDto[]> {
    const res = await fetch(`${API_BASE_URL}/peerpayments/outgoing`, { headers: this.getAuthHeaders() });
    return this.handleResponse<PeerPaymentRequestDto[]>(res);
  }

  async createRequest(req: CreatePeerPaymentRequest): Promise<PeerPaymentRequestDto> {
    const res = await fetch(`${API_BASE_URL}/peerpayments`, { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(req) });
    return this.handleResponse<PeerPaymentRequestDto>(res);
  }

  async accept(id: number, req: AcceptPeerPaymentRequest): Promise<PeerPaymentRequestDto> {
    const res = await fetch(`${API_BASE_URL}/peerpayments/${id}/accept`, { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(req) });
    return this.handleResponse<PeerPaymentRequestDto>(res);
  }

  async reject(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/peerpayments/${id}/reject`, { method: 'POST', headers: this.getAuthHeaders() });
    if (!res.ok) {
      try { const data = await res.json(); throw { message: data.message || 'An error occurred', errors: data.errors }; }
      catch { throw { message: res.statusText || 'An error occurred' }; }
    }
  }

  async cancel(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/peerpayments/${id}/cancel`, { method: 'POST', headers: this.getAuthHeaders() });
    if (!res.ok) {
      try { const data = await res.json(); throw { message: data.message || 'An error occurred', errors: data.errors }; }
      catch { throw { message: res.statusText || 'An error occurred' }; }
    }
  }

  async send(req: SendPeerPaymentRequest): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/peerpayments/send`, { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(req) });
    if (!res.ok) {
      try { const data = await res.json(); throw { message: data.message || 'An error occurred', errors: data.errors }; }
      catch { throw { message: res.statusText || 'An error occurred' }; }
    }
  }
}

export const peerPaymentService = new PeerPaymentService();


