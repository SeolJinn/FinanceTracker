using System.Net.Http.Json;

namespace FinanceTrackerApi.Services;

public class FxRateService : IFxRateService
{
	private readonly HttpClient _httpClient;

	public FxRateService(HttpClient httpClient)
	{
		_httpClient = httpClient;
	}

	public async Task<decimal> GetRateAsync(string fromCurrency, string toCurrency, CancellationToken cancellationToken = default)
	{
		if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
			return 1m;

		// Using the free frankfurter API
		var url = $"https://api.frankfurter.app/latest?from={Uri.EscapeDataString(fromCurrency.ToUpperInvariant())}&to={Uri.EscapeDataString(toCurrency.ToUpperInvariant())}";
		try
		{
			var json = await _httpClient.GetFromJsonAsync<FrankfurterResponse>(url, cancellationToken);
			if (json?.rates != null && json.rates.TryGetValue(toCurrency.ToUpperInvariant(), out var value))
			{
				return Convert.ToDecimal(value);
			}
		}
		catch
		{
			// fall back to 1 on failure;
		}
		return 1m;
	}

	private sealed class FrankfurterResponse
	{
		public string? base_currency { get; set; }
		public Dictionary<string, double> rates { get; set; } = new();
	}
}


