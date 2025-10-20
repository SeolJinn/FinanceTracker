using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Services;

namespace FinanceTrackerApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WalletController : ControllerBase
{
	private readonly IWalletService _walletService;
    private readonly IFxRateService _fxRateService;

	public WalletController(IWalletService walletService, IFxRateService fxRateService)
	{
		_walletService = walletService;
		_fxRateService = fxRateService;
	}

	[HttpGet]
	public async Task<ActionResult<IEnumerable<WalletDto>>> GetWallets()
	{
		var userId = GetUserId();
		var wallets = await _walletService.GetWalletsAsync(userId);
		return Ok(wallets);
	}

	[HttpPost]
	public async Task<ActionResult<WalletDto>> CreateWallet([FromBody] CreateWalletDto dto)
	{
		var userId = GetUserId();
		var wallet = await _walletService.CreateWalletAsync(userId, dto);
		return Ok(wallet);
	}

	[HttpDelete("{id}")]
	public async Task<IActionResult> DeleteWallet(int id)
	{
		var userId = GetUserId();
		var deleted = await _walletService.DeleteWalletAsync(userId, id);
		if (!deleted) return NotFound();
		return NoContent();
	}

	[HttpPut("{id}")]
	public async Task<ActionResult<WalletDto>> UpdateWallet(int id, [FromBody] UpdateWalletDto dto)
	{
		var userId = GetUserId();
		var wallet = await _walletService.UpdateWalletAsync(userId, id, dto);
		if (wallet == null) return NotFound();
		return Ok(wallet);
	}

	[HttpPost("transfer")]
	public async Task<IActionResult> Transfer([FromBody] TransferRequestDto dto)
	{
		try
		{
			var userId = GetUserId();
			await _walletService.TransferAsync(userId, dto.FromWalletId, dto.ToWalletId, dto.Amount, dto.Rate);
			return Ok();
		}
		catch (ArgumentException ex)
		{
			return BadRequest(new { message = ex.Message });
		}
		catch (InvalidOperationException ex)
		{
			return BadRequest(new { message = ex.Message });
		}
	}

	[HttpGet("rate")]
	public async Task<ActionResult<decimal>> GetRate([FromQuery] int fromWalletId, [FromQuery] int toWalletId)
	{
		var userId = GetUserId();
		var wallets = await _walletService.GetWalletsAsync(userId);
		var from = wallets.FirstOrDefault(w => w.Id == fromWalletId);
		var to = wallets.FirstOrDefault(w => w.Id == toWalletId);
		if (from == null || to == null) return NotFound();
		var rate = await _fxRateService.GetRateAsync(from.CurrencyCode, to.CurrencyCode);
		return Ok(rate);
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


