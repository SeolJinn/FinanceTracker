using System.ComponentModel.DataAnnotations;

namespace FinanceTrackerApi.Models;

public class SavingsGoal
{
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Target amount must be greater than 0")]
    public decimal TargetAmount { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime TargetDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}


