using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Services;

namespace FinanceTrackerApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PeerPaymentsController : ControllerBase
{
	private readonly IPeerPaymentService _service;

	public PeerPaymentsController(IPeerPaymentService service)
	{
		_service = service;
	}

	[HttpGet("incoming")]
	public async Task<ActionResult<IEnumerable<PeerPaymentRequestDto>>> Incoming()
	{
		var userId = GetUserId();
		var list = await _service.ListIncomingAsync(userId);
		return Ok(list);
	}

	[HttpGet("outgoing")]
	public async Task<ActionResult<IEnumerable<PeerPaymentRequestDto>>> Outgoing()
	{
		var userId = GetUserId();
		var list = await _service.ListOutgoingAsync(userId);
		return Ok(list);
	}

	[HttpPost]
	public async Task<ActionResult<PeerPaymentRequestDto>> Create([FromBody] CreatePeerPaymentRequestDto dto)
	{
		try
		{
			var userId = GetUserId();
			var created = await _service.CreateRequestAsync(userId, dto);
			return Ok(created);
		}
		catch (ArgumentException ex)
		{
			return BadRequest(new { message = ex.Message });
		}
	}

	[HttpPost("{id}/accept")]
	public async Task<ActionResult<PeerPaymentRequestDto>> Accept(int id, [FromBody] AcceptPeerPaymentRequestDto dto)
	{
		try
		{
			var userId = GetUserId();
			var result = await _service.AcceptAsync(userId, id, dto);
			if (result == null) return NotFound();
			return Ok(result);
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

	[HttpPost("{id}/reject")]
	public async Task<IActionResult> Reject(int id)
	{
		var userId = GetUserId();
		var ok = await _service.RejectAsync(userId, id);
		if (!ok) return NotFound();
		return NoContent();
	}

	[HttpPost("{id}/cancel")]
	public async Task<IActionResult> Cancel(int id)
	{
		var userId = GetUserId();
		var ok = await _service.CancelAsync(userId, id);
		if (!ok) return NotFound();
		return NoContent();
	}

	[HttpPost("send")]
	public async Task<IActionResult> Send([FromBody] SendPeerPaymentDto dto)
	{
		try
		{
			var userId = GetUserId();
			var ok = await _service.SendAsync(userId, dto);
			if (!ok) return BadRequest();
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


