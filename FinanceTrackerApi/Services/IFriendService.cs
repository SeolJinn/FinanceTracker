using FinanceTrackerApi.DTOs;

namespace FinanceTrackerApi.Services;

public interface IFriendService
{
	Task<FriendDto> AddFriendAsync(int userId, AddFriendDto dto);
	Task<bool> RemoveFriendAsync(int userId, int friendUserId);
	Task<FriendDto?> UpdateNicknameAsync(int userId, int friendUserId, UpdateFriendNicknameDto dto);
	Task<IEnumerable<FriendDto>> ListFriendsAsync(int userId);
    Task<IEnumerable<WalletDto>> ListFriendWalletsAsync(int userId, int friendUserId);

    // Friend request flows
    Task<FriendRequestDto> CreateFriendRequestAsync(int userId, CreateFriendRequestDto dto);
    Task<IEnumerable<FriendRequestDto>> ListIncomingRequestsAsync(int userId);
    Task<IEnumerable<FriendRequestDto>> ListOutgoingRequestsAsync(int userId);
    Task<bool> AcceptFriendRequestAsync(int userId, int requestId);
    Task<bool> RejectFriendRequestAsync(int userId, int requestId);
    Task<bool> CancelFriendRequestAsync(int userId, int requestId);
}


