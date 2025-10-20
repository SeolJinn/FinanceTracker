using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Services;

namespace FinanceTrackerApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SavingsGoalController : ControllerBase
{
    private readonly ISavingsGoalService _service;

    public SavingsGoalController(ISavingsGoalService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SavingsGoalResponseDto>>> List([FromQuery] int? walletId)
    {
        var userId = GetUserId();
        var goals = await _service.ListAsync(userId, walletId);
        return Ok(goals);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SavingsGoalResponseDto>> GetById(int id)
    {
        var userId = GetUserId();
        var goal = await _service.GetByIdAsync(userId, id);
        if (goal == null) return NotFound();
        return Ok(goal);
    }

    [HttpPost]
    public async Task<ActionResult<SavingsGoalResponseDto>> Create([FromBody] CreateSavingsGoalDto dto)
    {
        try
        {
            var userId = GetUserId();
            var goal = await _service.CreateAsync(userId, dto);
            return Ok(goal);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SavingsGoalResponseDto>> Update(int id, [FromBody] UpdateSavingsGoalDto dto)
    {
        try
        {
            var userId = GetUserId();
            var goal = await _service.UpdateAsync(userId, id, dto);
            if (goal == null) return NotFound();
            return Ok(goal);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var deleted = await _service.DeleteAsync(userId, id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        throw new UnauthorizedAccessException("Invalid user ID");
    }
}


