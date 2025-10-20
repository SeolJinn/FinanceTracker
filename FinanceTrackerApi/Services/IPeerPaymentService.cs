using FinanceTrackerApi.DTOs;

namespace FinanceTrackerApi.Services;

public interface IPeerPaymentService
{
	Task<PeerPaymentRequestDto> CreateRequestAsync(int requesterUserId, CreatePeerPaymentRequestDto dto);
	Task<IEnumerable<PeerPaymentRequestDto>> ListIncomingAsync(int userId);
	Task<IEnumerable<PeerPaymentRequestDto>> ListOutgoingAsync(int userId);
	Task<PeerPaymentRequestDto?> AcceptAsync(int payerUserId, int requestId, AcceptPeerPaymentRequestDto dto);
	Task<bool> RejectAsync(int payerUserId, int requestId);
	Task<bool> CancelAsync(int requesterUserId, int requestId);
    Task<bool> SendAsync(int senderUserId, SendPeerPaymentDto dto);
}


