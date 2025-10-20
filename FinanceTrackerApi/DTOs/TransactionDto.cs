using System.ComponentModel.DataAnnotations;
using FinanceTrackerApi.Models;

namespace FinanceTrackerApi.DTOs;

public class CreateTransactionDto
{
    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal Amount { get; set; }
    
    [Required]
    public TransactionType Type { get; set; }
    
    [Required]
    public int CategoryId { get; set; }
    
    [Required]
    public int WalletId { get; set; }
    
    [Required]
    public DateTime Date { get; set; }
    
    public string? Note { get; set; }
}

public class UpdateTransactionDto
{
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal? Amount { get; set; }
    
    public TransactionType? Type { get; set; }
    
    public int? CategoryId { get; set; }
    
    public int? WalletId { get; set; }
    
    public DateTime? Date { get; set; }
    
    public string? Note { get; set; }
}

public class TransactionResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int WalletId { get; set; }
    public string WalletCurrency { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public CategoryType Type { get; set; }
}

public class CreateSavingsGoalDto
{
    [Required]
    public int WalletId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Target amount must be greater than 0")]
    public decimal TargetAmount { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime TargetDate { get; set; }

    [MaxLength(100)]
    public string? Title { get; set; }
}

public class UpdateSavingsGoalDto
{
    [Range(0.01, double.MaxValue, ErrorMessage = "Target amount must be greater than 0")]
    public decimal? TargetAmount { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? TargetDate { get; set; }

    [MaxLength(100)]
    public string? Title { get; set; }
}

public class SavingsGoalResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int WalletId { get; set; }
    public decimal TargetAmount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime TargetDate { get; set; }
    public string? Title { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class WalletDto
{
	public int Id { get; set; }
	public string Name { get; set; } = string.Empty;
	public string CurrencyCode { get; set; } = string.Empty;
    public decimal Balance { get; set; }
}

public class CreateWalletDto
{
	[Required]
	[MaxLength(50)]
	public string Name { get; set; } = string.Empty;

	[Required]
	[MaxLength(3)]
	public string CurrencyCode { get; set; } = "USD";
}

public class UpdateWalletDto
{
	[MaxLength(50)]
	public string? Name { get; set; }
}

public class TransferRequestDto
{
	[Required]
	public int FromWalletId { get; set; }

	[Required]
	public int ToWalletId { get; set; }

	[Required]
	[Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
	public decimal Amount { get; set; }

	// Exchange rate expressed as: destinationCurrencyAmount = Amount * Rate
	[Range(0.000001, double.MaxValue)]
	public decimal? Rate { get; set; }
}