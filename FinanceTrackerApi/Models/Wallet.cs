using System.ComponentModel.DataAnnotations;

namespace FinanceTrackerApi.Models;

public class Wallet
{
	public int Id { get; set; }

	[Required]
	public int UserId { get; set; }

	[Required]
	[MaxLength(50)]
	public string Name { get; set; } = string.Empty;

	[Required]
	[MaxLength(3)]
	public string CurrencyCode { get; set; } = "USD"; // ISO 4217

	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

	public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

	// Navigation properties
	public User User { get; set; } = null!;
}


