using Microsoft.EntityFrameworkCore;
using FinanceTrackerApi.Data;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Models;

namespace FinanceTrackerApi.Services;

public class PeerPaymentService : IPeerPaymentService
{
	private readonly ApplicationDbContext _context;
	private readonly IFxRateService _fxRateService;

	public PeerPaymentService(ApplicationDbContext context, IFxRateService fxRateService)
	{
		_context = context;
		_fxRateService = fxRateService;
	}

	public async Task<PeerPaymentRequestDto> CreateRequestAsync(int requesterUserId, CreatePeerPaymentRequestDto dto)
	{
		var targetWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == dto.TargetWalletId && w.UserId == requesterUserId);
		if (targetWallet == null) throw new ArgumentException("Target wallet not found");

		var payer = await _context.Users.FindAsync(dto.PayerUserId);
		if (payer == null) throw new ArgumentException("Payer not found");
		if (payer.Id == requesterUserId) throw new ArgumentException("Cannot request payment from yourself");

		var now = DateTime.UtcNow;
		var request = new PeerPaymentRequest
		{
			RequesterUserId = requesterUserId,
			PayerUserId = dto.PayerUserId,
			TargetWalletId = dto.TargetWalletId,
			Amount = dto.Amount,
			Note = dto.Note,
			Status = PeerPaymentRequestStatus.Pending,
			CreatedAt = now,
			UpdatedAt = now
		};

		_context.PeerPaymentRequests.Add(request);
		await _context.SaveChangesAsync();

		return Map(request);
	}

	public async Task<IEnumerable<PeerPaymentRequestDto>> ListIncomingAsync(int userId)
	{
		var list = await _context.PeerPaymentRequests
			.Where(r => r.PayerUserId == userId && r.Status == PeerPaymentRequestStatus.Pending)
			.OrderByDescending(r => r.CreatedAt)
			.ToListAsync();
		return list.Select(Map);
	}

	public async Task<IEnumerable<PeerPaymentRequestDto>> ListOutgoingAsync(int userId)
	{
		var list = await _context.PeerPaymentRequests
			.Where(r => r.RequesterUserId == userId && r.Status == PeerPaymentRequestStatus.Pending)
			.OrderByDescending(r => r.CreatedAt)
			.ToListAsync();
		return list.Select(Map);
	}

	public async Task<PeerPaymentRequestDto?> AcceptAsync(int payerUserId, int requestId, AcceptPeerPaymentRequestDto dto)
	{
		var request = await _context.PeerPaymentRequests.FirstOrDefaultAsync(r => r.Id == requestId && r.PayerUserId == payerUserId);
		if (request == null) return null;
		if (request.Status != PeerPaymentRequestStatus.Pending) throw new InvalidOperationException("Request not pending");

		var fromWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == dto.FromWalletId && w.UserId == payerUserId);
		if (fromWallet == null) throw new ArgumentException("Source wallet not found");

		var toWallet = await _context.Wallets.FindAsync(request.TargetWalletId);
		if (toWallet == null) throw new ArgumentException("Target wallet not found");


		var rate = dto.Rate ?? await _fxRateService.GetRateAsync(fromWallet.CurrencyCode, toWallet.CurrencyCode);
		var now = DateTime.UtcNow;

		// Amount requested is in recipient's wallet currency.
		// Determine how much to deduct from payer's wallet: sourceAmount = destAmount / rate
		if (rate <= 0m) throw new InvalidOperationException("Invalid FX rate");
		var sourceAmountNeeded = Math.Round(request.Amount / rate, 2);

		// Check sufficient balance in payer's wallet
		var fromBalance = await _context.Transactions
			.Where(t => t.UserId == payerUserId && t.WalletId == dto.FromWalletId)
			.SumAsync(t => t.Type == TransactionType.Income ? t.Amount : -t.Amount);
		if (fromBalance < sourceAmountNeeded) throw new InvalidOperationException("Insufficient balance");

		// Ensure transfer categories exist
		int transferExpenseCategoryId;
		int transferIncomeCategoryId;
		{
			var transferExpense = await _context.Categories.FirstOrDefaultAsync(c => c.Type == CategoryType.Expense && c.Name == "Peer Transfer");
			if (transferExpense == null)
			{
				transferExpense = new Category { Name = "Peer Transfer", Type = CategoryType.Expense };
				_context.Categories.Add(transferExpense);
				await _context.SaveChangesAsync();
			}
			transferExpenseCategoryId = transferExpense.Id;

			var transferIncome = await _context.Categories.FirstOrDefaultAsync(c => c.Type == CategoryType.Income && c.Name == "Peer Transfer");
			if (transferIncome == null)
			{
				transferIncome = new Category { Name = "Peer Transfer", Type = CategoryType.Income };
				_context.Categories.Add(transferIncome);
				await _context.SaveChangesAsync();
			}
			transferIncomeCategoryId = transferIncome.Id;
		}

		// Create two transactions in both users' books
		var outTx = new Transaction
		{
			UserId = payerUserId,
			Amount = sourceAmountNeeded,
			Type = TransactionType.Expense,
			CategoryId = transferExpenseCategoryId,
			WalletId = dto.FromWalletId,
			Date = now,
			Note = $"Peer transfer to {await GetDisplayNameAsync(payerUserId, request.RequesterUserId)}",
			CreatedAt = now,
			UpdatedAt = now
		};

		var inTx = new Transaction
		{
			UserId = request.RequesterUserId,
			Amount = request.Amount,
			Type = TransactionType.Income,
			CategoryId = transferIncomeCategoryId,
			WalletId = request.TargetWalletId,
			Date = now,
			Note = $"Peer transfer from {await GetDisplayNameAsync(request.RequesterUserId, payerUserId)}",
			CreatedAt = now,
			UpdatedAt = now
		};

		_context.Transactions.AddRange(outTx, inTx);


		request.Status = PeerPaymentRequestStatus.Accepted;
		request.UpdatedAt = now;
		request.ResolvedAt = now;
		request.FromWalletId = dto.FromWalletId;
		request.RateUsed = rate;

		await _context.SaveChangesAsync();

		return Map(request);
	}

	public async Task<bool> RejectAsync(int payerUserId, int requestId)
	{
		var request = await _context.PeerPaymentRequests.FirstOrDefaultAsync(r => r.Id == requestId && r.PayerUserId == payerUserId);
		if (request == null) return false;
		if (request.Status != PeerPaymentRequestStatus.Pending) return false;
		request.Status = PeerPaymentRequestStatus.Rejected;
		request.UpdatedAt = DateTime.UtcNow;
		request.ResolvedAt = DateTime.UtcNow;
		await _context.SaveChangesAsync();
		return true;
	}

	public async Task<bool> CancelAsync(int requesterUserId, int requestId)
	{
		var request = await _context.PeerPaymentRequests.FirstOrDefaultAsync(r => r.Id == requestId && r.RequesterUserId == requesterUserId);
		if (request == null) return false;
		if (request.Status != PeerPaymentRequestStatus.Pending) return false;
		request.Status = PeerPaymentRequestStatus.Cancelled;
		request.UpdatedAt = DateTime.UtcNow;
		request.ResolvedAt = DateTime.UtcNow;
		await _context.SaveChangesAsync();
		return true;
	}

	public async Task<bool> SendAsync(int senderUserId, SendPeerPaymentDto dto)
	{
		var fromWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == dto.FromWalletId && w.UserId == senderUserId);
		if (fromWallet == null) throw new ArgumentException("Source wallet not found");

		var toWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == dto.TargetWalletId && w.UserId == dto.RecipientUserId);
		if (toWallet == null) throw new ArgumentException("Target wallet not found");

		if (dto.RecipientUserId == senderUserId) throw new ArgumentException("Cannot send to yourself");

		var fromBalance = await _context.Transactions
			.Where(t => t.UserId == senderUserId && t.WalletId == dto.FromWalletId)
			.SumAsync(t => t.Type == TransactionType.Income ? t.Amount : -t.Amount);
		if (fromBalance < dto.Amount) throw new InvalidOperationException("Insufficient balance");

		var rate = dto.Rate ?? await _fxRateService.GetRateAsync(fromWallet.CurrencyCode, toWallet.CurrencyCode);
		var now = DateTime.UtcNow;

		int transferExpenseCategoryId;
		int transferIncomeCategoryId;
		{
			var transferExpense = await _context.Categories.FirstOrDefaultAsync(c => c.Type == CategoryType.Expense && c.Name == "Peer Transfer");
			if (transferExpense == null)
			{
				transferExpense = new Category { Name = "Peer Transfer", Type = CategoryType.Expense };
				_context.Categories.Add(transferExpense);
				await _context.SaveChangesAsync();
			}
			transferExpenseCategoryId = transferExpense.Id;

			var transferIncome = await _context.Categories.FirstOrDefaultAsync(c => c.Type == CategoryType.Income && c.Name == "Peer Transfer");
			if (transferIncome == null)
			{
				transferIncome = new Category { Name = "Peer Transfer", Type = CategoryType.Income };
				_context.Categories.Add(transferIncome);
				await _context.SaveChangesAsync();
			}
			transferIncomeCategoryId = transferIncome.Id;
		}

		var outTx = new Transaction
		{
			UserId = senderUserId,
			Amount = dto.Amount,
			Type = TransactionType.Expense,
			CategoryId = transferExpenseCategoryId,
			WalletId = dto.FromWalletId,
			Date = now,
			Note = dto.Note ?? $"Peer transfer to {await GetDisplayNameAsync(senderUserId, dto.RecipientUserId)}",
			CreatedAt = now,
			UpdatedAt = now
		};

		var inTx = new Transaction
		{
			UserId = dto.RecipientUserId,
			Amount = Math.Round(dto.Amount * rate, 2),
			Type = TransactionType.Income,
			CategoryId = transferIncomeCategoryId,
			WalletId = dto.TargetWalletId,
			Date = now,
			Note = dto.Note ?? $"Peer transfer from {await GetDisplayNameAsync(dto.RecipientUserId, senderUserId)}",
			CreatedAt = now,
			UpdatedAt = now
		};

		_context.Transactions.AddRange(outTx, inTx);
		await _context.SaveChangesAsync();
		return true;
	}

    private PeerPaymentRequestDto Map(PeerPaymentRequest r)
    {
        var wallet = _context.Wallets.FirstOrDefault(w => w.Id == r.TargetWalletId);
        return new PeerPaymentRequestDto
        {
            Id = r.Id,
            RequesterUserId = r.RequesterUserId,
            PayerUserId = r.PayerUserId,
            TargetWalletId = r.TargetWalletId,
            Amount = r.Amount,
            TargetWalletCurrencyCode = wallet?.CurrencyCode ?? string.Empty,
            Note = r.Note,
            Status = r.Status.ToString(),
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        };
    }

	private async Task<string> GetDisplayNameAsync(int viewerUserId, int otherUserId)
	{
		var friend = await _context.Friends.FirstOrDefaultAsync(f => f.UserId == viewerUserId && f.FriendUserId == otherUserId);
		if (friend != null && !string.IsNullOrWhiteSpace(friend.Nickname))
			return friend.Nickname;

		var other = await _context.Users.FindAsync(otherUserId);
		if (other != null)
		{
			var fullName = $"{other.FirstName} {other.LastName}".Trim();
			if (!string.IsNullOrWhiteSpace(fullName)) return fullName;
			if (!string.IsNullOrWhiteSpace(other.Email)) return other.Email;
		}

		return $"user {otherUserId}";
	}
}


