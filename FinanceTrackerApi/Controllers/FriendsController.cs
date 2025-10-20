using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FinanceTrackerApi.DTOs;
using FinanceTrackerApi.Services;

namespace FinanceTrackerApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendsController : ControllerBase
{
	private readonly IFriendService _service;

	public FriendsController(IFriendService service)
	{
		_service = service;
	}

	[HttpGet]
	public async Task<ActionResult<IEnumerable<FriendDto>>> List()
	{
		var userId = GetUserId();
		var friends = await _service.ListFriendsAsync(userId);
		return Ok(friends);
	}

	[HttpGet("requests/incoming")]
	public async Task<ActionResult<IEnumerable<FriendRequestDto>>> IncomingRequests()
	{
		var userId = GetUserId();
		var list = await _service.ListIncomingRequestsAsync(userId);
		return Ok(list);
	}

	[HttpGet("requests/outgoing")]
	public async Task<ActionResult<IEnumerable<FriendRequestDto>>> OutgoingRequests()
	{
		var userId = GetUserId();
		var list = await _service.ListOutgoingRequestsAsync(userId);
		return Ok(list);
	}

	[HttpPost("requests")]
	public async Task<ActionResult<FriendRequestDto>> RequestFriend([FromBody] CreateFriendRequestDto dto)
	{
		try
		{
			var userId = GetUserId();
			var created = await _service.CreateFriendRequestAsync(userId, dto);
			return Ok(created);
		}
		catch (ArgumentException ex)
		{
			return BadRequest(new { message = ex.Message });
		}
	}

	[HttpPost("requests/{id}/accept")]
	public async Task<IActionResult> AcceptRequest(int id)
	{
		var userId = GetUserId();
		var ok = await _service.AcceptFriendRequestAsync(userId, id);
		if (!ok) return NotFound();
		return NoContent();
	}

	[HttpPost("requests/{id}/reject")]
	public async Task<IActionResult> RejectRequest(int id)
	{
		var userId = GetUserId();
		var ok = await _service.RejectFriendRequestAsync(userId, id);
		if (!ok) return NotFound();
		return NoContent();
	}

	[HttpPost("requests/{id}/cancel")]
	public async Task<IActionResult> CancelRequest(int id)
	{
		var userId = GetUserId();
		var ok = await _service.CancelFriendRequestAsync(userId, id);
		if (!ok) return NotFound();
		return NoContent();
	}

	[HttpPost]
	public async Task<ActionResult<FriendDto>> Add([FromBody] AddFriendDto dto)
	{
		try
		{
			var userId = GetUserId();
			var friend = await _service.AddFriendAsync(userId, dto);
			return Ok(friend);
		}
		catch (ArgumentException ex)
		{
			return BadRequest(new { message = ex.Message });
		}
	}

	[HttpPut("{friendUserId}/nickname")]
	public async Task<ActionResult<FriendDto>> UpdateNickname(int friendUserId, [FromBody] UpdateFriendNicknameDto dto)
	{
		var userId = GetUserId();
		var friend = await _service.UpdateNicknameAsync(userId, friendUserId, dto);
		if (friend == null) return NotFound();
		return Ok(friend);
	}

	[HttpDelete("{friendUserId}")]
	public async Task<IActionResult> Remove(int friendUserId)
	{
		var userId = GetUserId();
		var removed = await _service.RemoveFriendAsync(userId, friendUserId);
		if (!removed) return NotFound();
		return NoContent();
	}

	[HttpGet("{friendUserId}/wallets")]
	public async Task<ActionResult<IEnumerable<WalletDto>>> ListFriendWallets(int friendUserId)
	{
		try
		{
			var userId = GetUserId();
			var wallets = await _service.ListFriendWalletsAsync(userId, friendUserId);
			return Ok(wallets);
		}
		catch (ArgumentException ex)
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


