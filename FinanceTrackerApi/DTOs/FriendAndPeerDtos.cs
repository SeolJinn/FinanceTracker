using System.ComponentModel.DataAnnotations;

namespace FinanceTrackerApi.DTOs;

public class AddFriendDto
{
	[Required]
	[EmailAddress]
	public string Email { get; set; } = string.Empty;

	// Optional initial nickname; default will be part before '@' if not provided
	[MaxLength(100)]
	public string? Nickname { get; set; }
}

public class FriendDto
{
	public int Id { get; set; }
	public int FriendUserId { get; set; }
	public string Email { get; set; } = string.Empty;
	public string DisplayName { get; set; } = string.Empty;
	public string Nickname { get; set; } = string.Empty;
}

public class FriendRequestDto
{
    public int Id { get; set; }
    public int RequesterUserId { get; set; }
    public int ReceiverUserId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? RequestedNickname { get; set; }
    public DateTime CreatedAt { get; set; }
    public string RequesterEmail { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;
    public string ReceiverEmail { get; set; } = string.Empty;
    public string ReceiverName { get; set; } = string.Empty;
}

public class CreateFriendRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Nickname { get; set; }
}

public class UpdateFriendNicknameDto
{
	[Required]
	[MaxLength(100)]
	public string Nickname { get; set; } = string.Empty;
}

public class CreatePeerPaymentRequestDto
{
	[Required]
	public int PayerUserId { get; set; }

	// Wallet of the requester that will receive the funds
	[Required]
	public int TargetWalletId { get; set; }

	[Required]
	[Range(0.01, double.MaxValue)]
	public decimal Amount { get; set; }

	[MaxLength(200)]
	public string? Note { get; set; }
}

public class PeerPaymentRequestDto
{
	public int Id { get; set; }
	public int RequesterUserId { get; set; }
	public int PayerUserId { get; set; }
	public int TargetWalletId { get; set; }
	public decimal Amount { get; set; }
	public string? Note { get; set; }
	public string Status { get; set; } = string.Empty;
	public DateTime CreatedAt { get; set; }
	public DateTime UpdatedAt { get; set; }
}

public class AcceptPeerPaymentRequestDto
{
	[Required]
	public int FromWalletId { get; set; }

	// Optional custom FX rate (destinationAmount = amount * rate). If omitted, use live rate
	[Range(0.000001, double.MaxValue)]
	public decimal? Rate { get; set; }
}

public class SendPeerPaymentDto
{
    [Required]
    public int RecipientUserId { get; set; }

    // Recipient's wallet that will receive the funds
    [Required]
    public int TargetWalletId { get; set; }

    [Required]
    public int FromWalletId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    // Optional custom FX rate (destinationAmount = amount * rate)
    [Range(0.000001, double.MaxValue)]
    public decimal? Rate { get; set; }

    [MaxLength(200)]
    public string? Note { get; set; }
}


