using Microsoft.EntityFrameworkCore;
using FinanceTrackerApi.Data;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Models;

namespace FinanceTrackerApi.Services;

public class TransactionService : ITransactionService
{
    private readonly ApplicationDbContext _context;

    public TransactionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TransactionResponseDto> CreateTransactionAsync(int userId, CreateTransactionDto dto)
    {
        var category = await _context.Categories.FindAsync(dto.CategoryId);
        if (category == null)
        {
            throw new ArgumentException("Category not found");
        }

        var transaction = new Transaction
        {
            UserId = userId,
            Amount = dto.Amount,
            Type = dto.Type,
            CategoryId = dto.CategoryId,
            Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc),
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        return await GetTransactionResponseAsync(transaction.Id);
    }

    public async Task<TransactionResponseDto?> GetTransactionAsync(int userId, int transactionId)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.UserId == userId);

        if (transaction == null)
            return null;

        return MapToResponseDto(transaction);
    }

    public async Task<IEnumerable<TransactionResponseDto>> GetTransactionsAsync(int userId, DateTime? startDate = null, DateTime? endDate = null, TransactionType? type = null)
    {
        var query = _context.Transactions
            .Include(t => t.Category)
            .Where(t => t.UserId == userId);

        if (startDate.HasValue)
            query = query.Where(t => t.Date >= DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc));

        if (endDate.HasValue)
            query = query.Where(t => t.Date <= DateTime.SpecifyKind(endDate.Value, DateTimeKind.Utc));

        if (type.HasValue)
            query = query.Where(t => t.Type == type.Value);

        var transactions = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();

        return transactions.Select(MapToResponseDto);
    }

    public async Task<TransactionResponseDto?> UpdateTransactionAsync(int userId, int transactionId, UpdateTransactionDto dto)
    {
        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.UserId == userId);

        if (transaction == null)
            return null;

        if (dto.Amount.HasValue)
            transaction.Amount = dto.Amount.Value;

        if (dto.Type.HasValue)
            transaction.Type = dto.Type.Value;

        if (dto.CategoryId.HasValue)
        {
            var category = await _context.Categories.FindAsync(dto.CategoryId.Value);
            if (category == null)
                throw new ArgumentException("Category not found");
            transaction.CategoryId = dto.CategoryId.Value;
        }

        if (dto.Date.HasValue)
            transaction.Date = DateTime.SpecifyKind(dto.Date.Value, DateTimeKind.Utc);

        if (dto.Note != null)
            transaction.Note = dto.Note;

        transaction.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetTransactionResponseAsync(transactionId);
    }

    public async Task<bool> DeleteTransactionAsync(int userId, int transactionId)
    {
        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.UserId == userId);

        if (transaction == null)
            return false;

        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync(CategoryType? type = null)
    {
        var query = _context.Categories.AsQueryable();

        if (type.HasValue)
            query = query.Where(c => c.Type == type.Value);

        var categories = await query
            .OrderBy(c => c.Name)
            .ToListAsync();

        return categories.Select(c => new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Type = c.Type
        });
    }

    private async Task<TransactionResponseDto> GetTransactionResponseAsync(int transactionId)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Category)
            .FirstAsync(t => t.Id == transactionId);

        return MapToResponseDto(transaction);
    }

    private static TransactionResponseDto MapToResponseDto(Transaction transaction)
    {
        return new TransactionResponseDto
        {
            Id = transaction.Id,
            UserId = transaction.UserId,
            Amount = transaction.Amount,
            Type = transaction.Type,
            CategoryId = transaction.CategoryId,
            CategoryName = transaction.Category.Name,
            Date = transaction.Date,
            Note = transaction.Note,
            CreatedAt = transaction.CreatedAt,
            UpdatedAt = transaction.UpdatedAt
        };
    }
}