using System.ComponentModel.DataAnnotations;

namespace FinanceTrackerApi.Models;

public class PeerPaymentRequest
{
	public int Id { get; set; }

	[Required]
	public int RequesterUserId { get; set; }

	[Required]
	public int PayerUserId { get; set; }

	// Wallet belonging to the requester where funds will be deposited on acceptance
	[Required]
	public int TargetWalletId { get; set; }

	[Required]
	[Range(0.01, double.MaxValue)]
	public decimal Amount { get; set; }

	[MaxLength(200)]
	public string? Note { get; set; }

	[Required]
	public PeerPaymentRequestStatus Status { get; set; } = PeerPaymentRequestStatus.Pending;

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
	public DateTime? ResolvedAt { get; set; }

	// Optional audit fields when accepted
	public int? FromWalletId { get; set; }
	public decimal? RateUsed { get; set; }

	// Navigation
	public User RequesterUser { get; set; } = null!;
	public User PayerUser { get; set; } = null!;
	public Wallet TargetWallet { get; set; } = null!;
}

public enum PeerPaymentRequestStatus
{
	Pending = 0,
	Accepted = 1,
	Rejected = 2,
	Cancelled = 3
}


