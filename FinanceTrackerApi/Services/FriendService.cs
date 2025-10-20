using Microsoft.EntityFrameworkCore;
using FinanceTrackerApi.Data;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Models;

namespace FinanceTrackerApi.Services;

public class FriendService : IFriendService
{
	private readonly ApplicationDbContext _context;

	public FriendService(ApplicationDbContext context)
	{
		_context = context;
	}

	public async Task<FriendDto> AddFriendAsync(int userId, AddFriendDto dto)
	{
		var email = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();
		var friendUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
		if (friendUser == null) throw new ArgumentException("User not found");
		if (friendUser.Id == userId) throw new ArgumentException("Cannot add yourself as a friend");

		var exists = await _context.Friends.AnyAsync(f => f.UserId == userId && f.FriendUserId == friendUser.Id);
		if (exists) throw new ArgumentException("Friend already added");

		var nickname = (dto.Nickname ?? string.Empty).Trim();
		if (string.IsNullOrEmpty(nickname))
		{
			var local = email.Split('@')[0];
			nickname = local;
		}

		var now = DateTime.UtcNow;
		var friend = new Friend
		{
			UserId = userId,
			FriendUserId = friendUser.Id,
			Nickname = nickname,
			CreatedAt = now,
			UpdatedAt = now
		};

		_context.Friends.Add(friend);
		await _context.SaveChangesAsync();

		return new FriendDto
		{
			Id = friend.Id,
			FriendUserId = friendUser.Id,
			Email = friendUser.Email,
			DisplayName = $"{friendUser.FirstName} {friendUser.LastName}",
			Nickname = friend.Nickname
		};
	}

	public async Task<bool> RemoveFriendAsync(int userId, int friendUserId)
	{
		var entries = await _context.Friends
			.Where(f => (f.UserId == userId && f.FriendUserId == friendUserId) || (f.UserId == friendUserId && f.FriendUserId == userId))
			.ToListAsync();
		if (entries.Count == 0) return false;
		_context.Friends.RemoveRange(entries);
		await _context.SaveChangesAsync();
		return true;
	}

	public async Task<FriendDto?> UpdateNicknameAsync(int userId, int friendUserId, UpdateFriendNicknameDto dto)
	{
		var friend = await _context.Friends.FirstOrDefaultAsync(f => f.UserId == userId && f.FriendUserId == friendUserId);
		if (friend == null) return null;
		friend.Nickname = dto.Nickname.Trim();
		friend.UpdatedAt = DateTime.UtcNow;
		await _context.SaveChangesAsync();

		var friendUser = await _context.Users.FindAsync(friendUserId);
		if (friendUser == null) return null;
		return new FriendDto
		{
			Id = friend.Id,
			FriendUserId = friendUser.Id,
			Email = friendUser.Email,
			DisplayName = $"{friendUser.FirstName} {friendUser.LastName}",
			Nickname = friend.Nickname
		};
	}

	public async Task<IEnumerable<FriendDto>> ListFriendsAsync(int userId)
	{
		var friends = await _context.Friends
			.Where(f => f.UserId == userId)
			.Join(_context.Users, f => f.FriendUserId, u => u.Id, (f, u) => new FriendDto
			{
				Id = f.Id,
				FriendUserId = u.Id,
				Email = u.Email,
				DisplayName = $"{u.FirstName} {u.LastName}",
				Nickname = f.Nickname
			})
			.OrderBy(f => f.Nickname)
			.ToListAsync();
		return friends;
	}

	public async Task<IEnumerable<WalletDto>> ListFriendWalletsAsync(int userId, int friendUserId)
	{
		// Ensure friendship exists (user -> friend)
		var isFriend = await _context.Friends.AnyAsync(f => f.UserId == userId && f.FriendUserId == friendUserId);
		if (!isFriend) throw new ArgumentException("Not friends");

		var wallets = await _context.Wallets
			.Where(w => w.UserId == friendUserId)
			.OrderBy(w => w.Name)
			.ToListAsync();

		var balances = await _context.Transactions
			.Where(t => t.UserId == friendUserId)
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

	private static string DefaultNicknameForEmail(string email)
	{
		var idx = email.IndexOf('@');
		return idx > 0 ? email.Substring(0, idx) : email;
	}

	private static FriendRequestDto Map(FriendRequest r)
	{
		return new FriendRequestDto
		{
			Id = r.Id,
			RequesterUserId = r.RequesterUserId,
			ReceiverUserId = r.ReceiverUserId,
			Status = r.Status.ToString(),
			RequestedNickname = r.RequestedNickname,
			CreatedAt = r.CreatedAt
		};
	}

	private static FriendRequestDto ComposeDto(FriendRequest r, User requester, User receiver)
	{
		var dto = Map(r);
		dto.RequesterEmail = requester.Email;
		dto.RequesterName = $"{requester.FirstName} {requester.LastName}";
		dto.ReceiverEmail = receiver.Email;
		dto.ReceiverName = $"{receiver.FirstName} {receiver.LastName}";
		return dto;
	}

	public async Task<FriendRequestDto> CreateFriendRequestAsync(int userId, CreateFriendRequestDto dto)
	{
		var email = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();
		var receiver = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
		if (receiver == null) throw new ArgumentException("User not found");
		if (receiver.Id == userId) throw new ArgumentException("Cannot friend yourself");

		// Already friends?
		var alreadyFriends = await _context.Friends.AnyAsync(f => (f.UserId == userId && f.FriendUserId == receiver.Id) || (f.UserId == receiver.Id && f.FriendUserId == userId));
		if (alreadyFriends) throw new ArgumentException("Already friends");

		// If reverse pending exists, accept it immediately
		var reverse = await _context.FriendRequests.FirstOrDefaultAsync(r => r.RequesterUserId == receiver.Id && r.ReceiverUserId == userId && r.Status == FriendRequestStatus.Pending);
		if (reverse != null)
		{
			await AcceptRequestInternal(reverse);
			var reqUser = await _context.Users.FindAsync(reverse.RequesterUserId);
			var recvUser = await _context.Users.FindAsync(reverse.ReceiverUserId);
			return ComposeDto(reverse, reqUser!, recvUser!);
		}

		// Create or update pending
		var existing = await _context.FriendRequests.FirstOrDefaultAsync(r => r.RequesterUserId == userId && r.ReceiverUserId == receiver.Id);
		if (existing != null)
		{
			existing.Status = FriendRequestStatus.Pending;
			existing.RequestedNickname = dto.Nickname?.Trim();
			existing.UpdatedAt = DateTime.UtcNow;
			await _context.SaveChangesAsync();
			var meUpd = await _context.Users.FindAsync(userId);
			var recvUpd = await _context.Users.FindAsync(receiver.Id);
			return ComposeDto(existing, meUpd!, recvUpd!);
		}

		var now = DateTime.UtcNow;
		var req = new FriendRequest
		{
			RequesterUserId = userId,
			ReceiverUserId = receiver.Id,
			Status = FriendRequestStatus.Pending,
			RequestedNickname = dto.Nickname?.Trim(),
			CreatedAt = now,
			UpdatedAt = now
		};
		_context.FriendRequests.Add(req);
		await _context.SaveChangesAsync();
		var me = await _context.Users.FindAsync(userId);
		var recv = await _context.Users.FindAsync(receiver.Id);
		return ComposeDto(req, me!, recv!);
	}

	public async Task<IEnumerable<FriendRequestDto>> ListIncomingRequestsAsync(int userId)
	{
		var list = await _context.FriendRequests.Where(r => r.ReceiverUserId == userId && r.Status == FriendRequestStatus.Pending)
			.OrderByDescending(r => r.CreatedAt).ToListAsync();
		var requesterIds = list.Select(r => r.RequesterUserId).Distinct().ToList();
		var users = await _context.Users.Where(u => requesterIds.Contains(u.Id) || u.Id == userId).ToListAsync();
		var me = users.First(u => u.Id == userId);
		return list.Select(r => ComposeDto(r, users.First(u => u.Id == r.RequesterUserId), me));
	}

	public async Task<IEnumerable<FriendRequestDto>> ListOutgoingRequestsAsync(int userId)
	{
		var list = await _context.FriendRequests.Where(r => r.RequesterUserId == userId && r.Status == FriendRequestStatus.Pending)
			.OrderByDescending(r => r.CreatedAt).ToListAsync();
		var receiverIds = list.Select(r => r.ReceiverUserId).Distinct().ToList();
		var users = await _context.Users.Where(u => receiverIds.Contains(u.Id) || u.Id == userId).ToListAsync();
		var me = users.First(u => u.Id == userId);
		return list.Select(r => ComposeDto(r, me, users.First(u => u.Id == r.ReceiverUserId)));
	}

	public async Task<bool> AcceptFriendRequestAsync(int userId, int requestId)
	{
		var req = await _context.FriendRequests.FirstOrDefaultAsync(r => r.Id == requestId && r.ReceiverUserId == userId);
		if (req == null) return false;
		if (req.Status != FriendRequestStatus.Pending) return false;
		await AcceptRequestInternal(req);
		return true;
	}

	private async Task AcceptRequestInternal(FriendRequest req)
	{
		var requester = await _context.Users.FindAsync(req.RequesterUserId);
		var receiver = await _context.Users.FindAsync(req.ReceiverUserId);
		if (requester == null || receiver == null) throw new ArgumentException("User not found");

		var now = DateTime.UtcNow;
		// Create two friend entries
		var existingBoth = await _context.Friends
			.Where(f => (f.UserId == requester.Id && f.FriendUserId == receiver.Id) || (f.UserId == receiver.Id && f.FriendUserId == requester.Id))
			.ToListAsync();
		if (existingBoth.Count == 0)
		{
			_context.Friends.AddRange(
				new Friend { UserId = requester.Id, FriendUserId = receiver.Id, Nickname = string.IsNullOrWhiteSpace(req.RequestedNickname) ? DefaultNicknameForEmail(receiver.Email) : req.RequestedNickname!.Trim(), CreatedAt = now, UpdatedAt = now },
				new Friend { UserId = receiver.Id, FriendUserId = requester.Id, Nickname = DefaultNicknameForEmail(requester.Email), CreatedAt = now, UpdatedAt = now }
			);
		}

		req.Status = FriendRequestStatus.Accepted;
		req.UpdatedAt = now;
		req.ResolvedAt = now;
		await _context.SaveChangesAsync();
	}

	public async Task<bool> RejectFriendRequestAsync(int userId, int requestId)
	{
		var req = await _context.FriendRequests.FirstOrDefaultAsync(r => r.Id == requestId && r.ReceiverUserId == userId);
		if (req == null) return false;
		if (req.Status != FriendRequestStatus.Pending) return false;
		req.Status = FriendRequestStatus.Rejected;
		req.UpdatedAt = DateTime.UtcNow;
		req.ResolvedAt = DateTime.UtcNow;
		await _context.SaveChangesAsync();
		return true;
	}

	public async Task<bool> CancelFriendRequestAsync(int userId, int requestId)
	{
		var req = await _context.FriendRequests.FirstOrDefaultAsync(r => r.Id == requestId && r.RequesterUserId == userId);
		if (req == null) return false;
		if (req.Status != FriendRequestStatus.Pending) return false;
		req.Status = FriendRequestStatus.Cancelled;
		req.UpdatedAt = DateTime.UtcNow;
		req.ResolvedAt = DateTime.UtcNow;
		await _context.SaveChangesAsync();
		return true;
	}
}


