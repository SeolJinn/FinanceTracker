namespace FinanceTrackerApi.Services;

public interface IFxRateService
{
	Task<decimal> GetRateAsync(string fromCurrency, string toCurrency, CancellationToken cancellationToken = default);
}


