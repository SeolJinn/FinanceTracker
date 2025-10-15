using FinanceTrackerApi.Data;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceTrackerApi.Services;

public interface ISavingsGoalService
{
    Task<SavingsGoalResponseDto?> GetAsync(int userId);
    Task<SavingsGoalResponseDto> UpsertAsync(int userId, SavingsGoalDto dto);
    Task<bool> DeleteAsync(int userId);
}

public class SavingsGoalService : ISavingsGoalService
{
    private readonly ApplicationDbContext _context;

    public SavingsGoalService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SavingsGoalResponseDto?> GetAsync(int userId)
    {
        var goal = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.UserId == userId);
        if (goal == null) return null;
        return Map(goal);
    }

    public async Task<SavingsGoalResponseDto> UpsertAsync(int userId, SavingsGoalDto dto)
    {
        if (dto.TargetAmount <= 0) throw new ArgumentException("Target amount must be greater than 0");
        if (dto.TargetDate <= dto.StartDate) throw new ArgumentException("Target date must be after start date");

        var existing = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.UserId == userId);
        if (existing == null)
        {
            var goal = new SavingsGoal
            {
                UserId = userId,
                TargetAmount = dto.TargetAmount,
                StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc),
                TargetDate = DateTime.SpecifyKind(dto.TargetDate, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.SavingsGoals.Add(goal);
            await _context.SaveChangesAsync();
            return Map(goal);
        }

        existing.TargetAmount = dto.TargetAmount;
        existing.StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc);
        existing.TargetDate = DateTime.SpecifyKind(dto.TargetDate, DateTimeKind.Utc);
        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Map(existing);
    }

    public async Task<bool> DeleteAsync(int userId)
    {
        var existing = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.UserId == userId);
        if (existing == null) return false;
        _context.SavingsGoals.Remove(existing);
        await _context.SaveChangesAsync();
        return true;
    }

    private static SavingsGoalResponseDto Map(SavingsGoal g)
    {
        return new SavingsGoalResponseDto
        {
            Id = g.Id,
            UserId = g.UserId,
            TargetAmount = g.TargetAmount,
            StartDate = g.StartDate,
            TargetDate = g.TargetDate,
            CreatedAt = g.CreatedAt,
            UpdatedAt = g.UpdatedAt
        };
    }
}


