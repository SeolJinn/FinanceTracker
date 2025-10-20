using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Models;
using FinanceTrackerApi.Services;

namespace FinanceTrackerApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    public TransactionController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    [HttpPost]
    public async Task<ActionResult<TransactionResponseDto>> CreateTransaction([FromBody] CreateTransactionDto dto)
    {
        try
        {
            var userId = GetUserId();
            var transaction = await _transactionService.CreateTransactionAsync(userId, dto);
            return Ok(transaction);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TransactionResponseDto>> GetTransaction(int id)
    {
        var userId = GetUserId();
        var transaction = await _transactionService.GetTransactionAsync(userId, id);
        
        if (transaction == null)
            return NotFound();
            
        return Ok(transaction);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransactionResponseDto>>> GetTransactions(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] TransactionType? type = null,
        [FromQuery] int? walletId = null)
    {
        var userId = GetUserId();
        var transactions = await _transactionService.GetTransactionsAsync(userId, startDate, endDate, type, walletId);
        return Ok(transactions);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TransactionResponseDto>> UpdateTransaction(int id, [FromBody] UpdateTransactionDto dto)
    {
        try
        {
            var userId = GetUserId();
            var transaction = await _transactionService.UpdateTransactionAsync(userId, id, dto);
            
            if (transaction == null)
                return NotFound();
                
            return Ok(transaction);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(int id)
    {
        var userId = GetUserId();
        var deleted = await _transactionService.DeleteTransactionAsync(userId, id);
        
        if (!deleted)
            return NotFound();
            
        return NoContent();
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetCategories([FromQuery] CategoryType? type = null)
    {
        var categories = await _transactionService.GetCategoriesAsync(type);
        return Ok(categories);
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