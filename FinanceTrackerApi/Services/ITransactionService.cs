using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Models;

namespace FinanceTrackerApi.Services;

public interface ITransactionService
{
    Task<TransactionResponseDto> CreateTransactionAsync(int userId, CreateTransactionDto dto);
    Task<TransactionResponseDto?> GetTransactionAsync(int userId, int transactionId);
    Task<IEnumerable<TransactionResponseDto>> GetTransactionsAsync(int userId, DateTime? startDate = null, DateTime? endDate = null, TransactionType? type = null, int? walletId = null);
    Task<TransactionResponseDto?> UpdateTransactionAsync(int userId, int transactionId, UpdateTransactionDto dto);
    Task<bool> DeleteTransactionAsync(int userId, int transactionId);
    Task<IEnumerable<CategoryDto>> GetCategoriesAsync(CategoryType? type = null);
}