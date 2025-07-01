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
    public DateTime Date { get; set; }
    
    public string? Note { get; set; }
}

public class UpdateTransactionDto
{
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal? Amount { get; set; }
    
    public TransactionType? Type { get; set; }
    
    public int? CategoryId { get; set; }
    
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