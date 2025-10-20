using System.ComponentModel.DataAnnotations;

namespace FinanceTrackerApi.Models;

public class Friend
{
	public int Id { get; set; }

	[Required]
	public int UserId { get; set; }

	[Required]
	public int FriendUserId { get; set; }

	[Required]
	[MaxLength(100)]
	public string Nickname { get; set; } = string.Empty;

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

	// Navigation properties
	public User User { get; set; } = null!;
	public User FriendUser { get; set; } = null!;
}


