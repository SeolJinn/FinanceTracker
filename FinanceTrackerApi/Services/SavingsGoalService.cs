using FinanceTrackerApi.Data;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceTrackerApi.Services;

public interface ISavingsGoalService
{
    Task<IEnumerable<SavingsGoalResponseDto>> ListAsync(int userId, int? walletId = null);
    Task<SavingsGoalResponseDto?> GetByIdAsync(int userId, int goalId);
    Task<SavingsGoalResponseDto> CreateAsync(int userId, CreateSavingsGoalDto dto);
    Task<SavingsGoalResponseDto?> UpdateAsync(int userId, int goalId, UpdateSavingsGoalDto dto);
    Task<bool> DeleteAsync(int userId, int goalId);
}

public class SavingsGoalService : ISavingsGoalService
{
    private readonly ApplicationDbContext _context;

    public SavingsGoalService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<SavingsGoalResponseDto>> ListAsync(int userId, int? walletId = null)
    {
        var query = _context.SavingsGoals.Where(g => g.UserId == userId);
        if (walletId.HasValue)
            query = query.Where(g => g.WalletId == walletId.Value);
        var goals = await query.OrderByDescending(g => g.CreatedAt).ToListAsync();
        return goals.Select(Map);
    }

    public async Task<SavingsGoalResponseDto?> GetByIdAsync(int userId, int goalId)
    {
        var goal = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.UserId == userId && g.Id == goalId);
        return goal == null ? null : Map(goal);
    }

    public async Task<SavingsGoalResponseDto> CreateAsync(int userId, CreateSavingsGoalDto dto)
    {
        if (dto.TargetAmount <= 0) throw new ArgumentException("Target amount must be greater than 0");
        if (dto.TargetDate <= dto.StartDate) throw new ArgumentException("Target date must be after start date");

        var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.Id == dto.WalletId && w.UserId == userId);
        if (wallet == null) throw new ArgumentException("Wallet not found");

        var goal = new SavingsGoal
        {
            UserId = userId,
            WalletId = dto.WalletId,
            Title = (dto.Title ?? string.Empty).Trim() == string.Empty ? null : dto.Title!.Trim(),
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

    public async Task<SavingsGoalResponseDto?> UpdateAsync(int userId, int goalId, UpdateSavingsGoalDto dto)
    {
        var goal = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.UserId == userId && g.Id == goalId);
        if (goal == null) return null;

        if (dto.TargetAmount.HasValue)
        {
            if (dto.TargetAmount.Value <= 0) throw new ArgumentException("Target amount must be greater than 0");
            goal.TargetAmount = dto.TargetAmount.Value;
        }
        if (dto.StartDate.HasValue)
        {
            goal.StartDate = DateTime.SpecifyKind(dto.StartDate.Value, DateTimeKind.Utc);
        }
        if (dto.TargetDate.HasValue)
        {
            goal.TargetDate = DateTime.SpecifyKind(dto.TargetDate.Value, DateTimeKind.Utc);
        }
        if (dto.Title != null)
        {
            goal.Title = dto.Title.Trim() == string.Empty ? null : dto.Title.Trim();
        }

        if (goal.TargetDate <= goal.StartDate) throw new ArgumentException("Target date must be after start date");

        goal.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Map(goal);
    }

    public async Task<bool> DeleteAsync(int userId, int goalId)
    {
        var existing = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.UserId == userId && g.Id == goalId);
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
            WalletId = g.WalletId,
            TargetAmount = g.TargetAmount,
            StartDate = g.StartDate,
            TargetDate = g.TargetDate,
            Title = g.Title,
            CreatedAt = g.CreatedAt,
            UpdatedAt = g.UpdatedAt
        };
    }
}


