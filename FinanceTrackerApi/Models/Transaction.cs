using System.ComponentModel.DataAnnotations;

namespace FinanceTrackerApi.Models;

public class Transaction
{
    public int Id { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
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
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

public enum TransactionType
{
    Expense = 0,
    Income = 1
}