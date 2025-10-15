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
    public async Task<ActionResult<SavingsGoalResponseDto?>> Get()
    {
        var userId = GetUserId();
        var goal = await _service.GetAsync(userId);
        if (goal == null) return NotFound();
        return Ok(goal);
    }

    [HttpPut]
    public async Task<ActionResult<SavingsGoalResponseDto>> Upsert([FromBody] SavingsGoalDto dto)
    {
        try
        {
            var userId = GetUserId();
            var goal = await _service.UpsertAsync(userId, dto);
            return Ok(goal);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> Delete()
    {
        var userId = GetUserId();
        var deleted = await _service.DeleteAsync(userId);
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


