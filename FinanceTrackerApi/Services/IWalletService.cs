using FinanceTrackerApi.DTOs;

namespace FinanceTrackerApi.Services;

public interface IWalletService
{
	Task<IEnumerable<WalletDto>> GetWalletsAsync(int userId);
	Task<WalletDto> CreateWalletAsync(int userId, CreateWalletDto dto);
    Task<WalletDto?> UpdateWalletAsync(int userId, int walletId, UpdateWalletDto dto);
	Task<bool> DeleteWalletAsync(int userId, int walletId);
    Task TransferAsync(int userId, int fromWalletId, int toWalletId, decimal amount, decimal? customRate = null);
}


