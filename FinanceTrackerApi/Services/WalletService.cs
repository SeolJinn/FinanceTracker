using Microsoft.EntityFrameworkCore;
using FinanceTrackerApi.Data;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Models;

namespace FinanceTrackerApi.Services;

public class WalletService : IWalletService
{
	private readonly ApplicationDbContext _context;
    private readonly IFxRateService _fxRateService;

	public WalletService(ApplicationDbContext context, IFxRateService fxRateService)
	{
		_context = context;
		_fxRateService = fxRateService;
	}

	public async Task<IEnumerable<WalletDto>> GetWalletsAsync(int userId)
	{
		var wallets = await _context.Wallets
			.Where(w => w.UserId == userId)
			.OrderBy(w => w.Name)
			.ToListAsync();

        var balances = await _context.Transactions
            .GroupBy(t => t.WalletId)
            .Select(g => new { WalletId = g.Key, Balance = g.Sum(t => t.Type == TransactionType.Income ? t.Amount : -t.Amount) })
            .ToDictionaryAsync(x => x.WalletId, x => x.Balance);

        return wallets.Select(w => new WalletDto
        {
            Id = w.Id,
            Name = w.Name,
            CurrencyCode = w.CurrencyCode,
            Balance = balances.ContainsKey(w.Id) ? balances[w.Id] : 0m
        });
	}

	public async Task<WalletDto> CreateWalletAsync(int userId, CreateWalletDto dto)
	{
		var currency = (dto.CurrencyCode ?? "").Trim().ToUpperInvariant();
		if (currency.Length != 3)
			throw new ArgumentException("CurrencyCode must be a 3-letter ISO code");

		var wallet = new Wallet
		{
			UserId = userId,
			Name = dto.Name.Trim(),
			CurrencyCode = currency,
			CreatedAt = DateTime.UtcNow,
			UpdatedAt = DateTime.UtcNow
		};

		_context.Wallets.Add(wallet);
		await _context.SaveChangesAsync();

		return new WalletDto { Id = wallet.Id, Name = wallet.Name, CurrencyCode = wallet.CurrencyCode };
	}

	public async Task<WalletDto?> UpdateWalletAsync(int userId, int walletId, UpdateWalletDto dto)
	{
		var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);
		if (wallet == null) return null;

		if (!string.IsNullOrWhiteSpace(dto.Name))
		{
			wallet.Name = dto.Name.Trim();
		}
		wallet.UpdatedAt = DateTime.UtcNow;
		await _context.SaveChangesAsync();

		return new WalletDto { Id = wallet.Id, Name = wallet.Name, CurrencyCode = wallet.CurrencyCode };
	}

	public async Task<bool> DeleteWalletAsync(int userId, int walletId)
	{
		var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);
		if (wallet == null) return false;

		bool hasTransactions = await _context.Transactions.AnyAsync(t => t.WalletId == walletId && t.UserId == userId);
		if (hasTransactions)
			throw new InvalidOperationException("Cannot delete wallet with existing transactions");

		_context.Wallets.Remove(wallet);
		await _context.SaveChangesAsync();
		return true;
	}

	public async Task TransferAsync(int userId, int fromWalletId, int toWalletId, decimal amount, decimal? customRate = null)
	{
		if (fromWalletId == toWalletId) throw new ArgumentException("Cannot transfer to the same wallet");
		if (amount <= 0) throw new ArgumentException("Amount must be greater than 0");

		var from = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == fromWalletId && w.UserId == userId);
		var to = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == toWalletId && w.UserId == userId);
		if (from == null || to == null) throw new ArgumentException("Wallet not found");

		// Check sufficient balance
		var fromBalance = await _context.Transactions
			.Where(t => t.UserId == userId && t.WalletId == fromWalletId)
			.SumAsync(t => t.Type == TransactionType.Income ? t.Amount : -t.Amount);
		if (fromBalance < amount)
		{
			throw new InvalidOperationException("Insufficient balance");
		}

		var rate = customRate ?? await _fxRateService.GetRateAsync(from.CurrencyCode, to.CurrencyCode);
		var now = DateTime.UtcNow;

		// Represent transfer as two transactions: expense from source, income to destination
		// Ensure transfer categories exist (one for expense, one for income)
		int transferExpenseCategoryId;
		int transferIncomeCategoryId;
		{
			var transferExpense = await _context.Categories.FirstOrDefaultAsync(c => c.Type == CategoryType.Expense && c.Name == "Wallet Transfer");
			if (transferExpense == null)
			{
				transferExpense = new Category { Name = "Wallet Transfer", Type = CategoryType.Expense };
				_context.Categories.Add(transferExpense);
				await _context.SaveChangesAsync();
			}
			transferExpenseCategoryId = transferExpense.Id;

			var transferIncome = await _context.Categories.FirstOrDefaultAsync(c => c.Type == CategoryType.Income && c.Name == "Wallet Transfer");
			if (transferIncome == null)
			{
				transferIncome = new Category { Name = "Wallet Transfer", Type = CategoryType.Income };
				_context.Categories.Add(transferIncome);
				await _context.SaveChangesAsync();
			}
			transferIncomeCategoryId = transferIncome.Id;
		}

		var outTx = new Transaction
		{
			UserId = userId,
			Amount = amount,
			Type = Models.TransactionType.Expense,
			CategoryId = transferExpenseCategoryId,
			WalletId = fromWalletId,
			Date = now,
			Note = $"Transfer to {to.Name} ({to.CurrencyCode})",
			CreatedAt = now,
			UpdatedAt = now
		};

		var inTx = new Transaction
		{
			UserId = userId,
			Amount = Math.Round(amount * rate, 2),
			Type = Models.TransactionType.Income,
			CategoryId = transferIncomeCategoryId,
			WalletId = toWalletId,
			Date = now,
			Note = $"Transfer from {from.Name} ({from.CurrencyCode})",
			CreatedAt = now,
			UpdatedAt = now
		};

		_context.Transactions.AddRange(outTx, inTx);
		await _context.SaveChangesAsync();
	}
}


