const API_BASE_URL = 'http://localhost:5000/api';

export interface WalletDto {
	id: number;
	name: string;
	currencyCode: string;
  	balance: number;
}

export interface CreateWalletRequest {
	name: string;
	currencyCode: string; // ISO 4217 e.g., USD, EUR, JPY, CNY
}

export interface TransferRequest {
	fromWalletId: number;
	toWalletId: number;
	amount: number;
	rate?: number; // optional exchange rate
}

class WalletService {
	private getAuthHeaders(): HeadersInit {
		const token = localStorage.getItem('authToken');
		return {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		};
	}

	private async handleResponse<T>(response: Response): Promise<T> {
		const hasBody = (() => {
			const len = response.headers.get('content-length')
			if (len && parseInt(len) === 0) return false
			// Some servers don't set content-length; check status codes typically without body
			return response.status !== 204 && response.status !== 205
		})()

		if (!response.ok) {
			if (hasBody) {
				try {
					const errorData = await response.json()
					throw { message: errorData.message || 'An error occurred', errors: errorData.errors }
				} catch {
					throw { message: response.statusText || 'An error occurred' }
				}
			}
			throw { message: response.statusText || 'An error occurred' }
		}

		if (!hasBody) return undefined as unknown as T
		try {
			return await response.json()
		} catch {
			return undefined as unknown as T
		}
	}

	async list(): Promise<WalletDto[]> {
		const response = await fetch(`${API_BASE_URL}/wallet`, {
			method: 'GET',
			headers: this.getAuthHeaders(),
		});
		return this.handleResponse<WalletDto[]>(response);
	}

	async create(request: CreateWalletRequest): Promise<WalletDto> {
		const response = await fetch(`${API_BASE_URL}/wallet`, {
			method: 'POST',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(request),
		});
		return this.handleResponse<WalletDto>(response);
	}

	async update(id: number, request: { name?: string }): Promise<WalletDto> {
		const response = await fetch(`${API_BASE_URL}/wallet/${id}`, {
			method: 'PUT',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(request),
		});
		return this.handleResponse<WalletDto>(response);
	}

	async delete(id: number): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/wallet/${id}`, {
			method: 'DELETE',
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			try {
				const errorData = await response.json();
				throw { message: errorData.message || 'An error occurred', errors: errorData.errors };
			} catch {
				throw { message: response.statusText || 'An error occurred' }
			}
		}
	}

	async transfer(req: TransferRequest): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/wallet/transfer`, {
			method: 'POST',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(req),
		});
		if (!response.ok) {
			try {
				const errorData = await response.json();
				throw { message: errorData.message || 'An error occurred', errors: errorData.errors };
			} catch {
				throw { message: response.statusText || 'An error occurred' }
			}
		}
	}

	async getRate(fromWalletId: number, toWalletId: number): Promise<number> {
		const response = await fetch(`${API_BASE_URL}/wallet/rate?fromWalletId=${fromWalletId}&toWalletId=${toWalletId}`, {
			headers: this.getAuthHeaders(),
		});
		return this.handleResponse<number>(response);
	}
}

export const walletService = new WalletService();


