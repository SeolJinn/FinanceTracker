using System.ComponentModel.DataAnnotations;

namespace FinanceTrackerApi.Models;

public class FriendRequest
{
	public int Id { get; set; }

	[Required]
	public int RequesterUserId { get; set; }

	[Required]
	public int ReceiverUserId { get; set; }

	[Required]
	public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;

	[MaxLength(100)]
	public string? RequestedNickname { get; set; }

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
	public DateTime? ResolvedAt { get; set; }

	public User RequesterUser { get; set; } = null!;
	public User ReceiverUser { get; set; } = null!;
}

public enum FriendRequestStatus
{
	Pending = 0,
	Accepted = 1,
	Rejected = 2,
	Cancelled = 3
}


