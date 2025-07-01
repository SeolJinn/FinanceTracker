using FinanceTrackerApi.Models;

namespace FinanceTrackerApi.Data;

public static class DataSeeder
{
    public static async Task SeedCategoriesAsync(ApplicationDbContext context)
    {
        if (!context.Categories.Any())
        {
            var categories = new List<Category>
            {
                // Expense categories
                new Category { Name = "Food", Type = CategoryType.Expense },
                new Category { Name = "Rent", Type = CategoryType.Expense },
                new Category { Name = "Transportation", Type = CategoryType.Expense },
                new Category { Name = "Utilities", Type = CategoryType.Expense },
                new Category { Name = "Entertainment", Type = CategoryType.Expense },
                new Category { Name = "Healthcare", Type = CategoryType.Expense },
                new Category { Name = "Shopping", Type = CategoryType.Expense },
                new Category { Name = "Insurance", Type = CategoryType.Expense },
                new Category { Name = "Education", Type = CategoryType.Expense },
                new Category { Name = "Other Expenses", Type = CategoryType.Expense },
                
                // Income categories
                new Category { Name = "Salary", Type = CategoryType.Income },
                new Category { Name = "Freelance", Type = CategoryType.Income },
                new Category { Name = "Investment", Type = CategoryType.Income },
                new Category { Name = "Gift", Type = CategoryType.Income },
                new Category { Name = "Other Income", Type = CategoryType.Income }
            };

            context.Categories.AddRange(categories);
            await context.SaveChangesAsync();
        }
    }
}