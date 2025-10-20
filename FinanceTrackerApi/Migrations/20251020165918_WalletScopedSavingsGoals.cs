using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinanceTrackerApi.Migrations
{
    /// <inheritdoc />
    public partial class WalletScopedSavingsGoals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SavingsGoals_UserId",
                table: "SavingsGoals");

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "SavingsGoals",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WalletId",
                table: "SavingsGoals",
                type: "integer",
                nullable: true);

            // Ensure each user with a savings goal has at least one wallet
            migrationBuilder.Sql(@"
INSERT INTO ""Wallets"" (""UserId"", ""Name"", ""CurrencyCode"", ""CreatedAt"", ""UpdatedAt"")
SELECT DISTINCT sg.""UserId"", 'Main', 'USD', NOW(), NOW()
FROM ""SavingsGoals"" sg
WHERE NOT EXISTS (
  SELECT 1 FROM ""Wallets"" w WHERE w.""UserId"" = sg.""UserId""
);
");

            // Assign a wallet to existing savings goals
            migrationBuilder.Sql(@"
UPDATE ""SavingsGoals"" sg
SET ""WalletId"" = w.""Id""
FROM ""Wallets"" w
WHERE w.""UserId"" = sg.""UserId"" AND sg.""WalletId"" IS NULL
AND w.""Id"" = (
  SELECT w2.""Id"" FROM ""Wallets"" w2 WHERE w2.""UserId"" = sg.""UserId"" ORDER BY w2.""Id"" ASC LIMIT 1
);
");

            // Make WalletId non-null after backfill
            migrationBuilder.AlterColumn<int>(
                name: "WalletId",
                table: "SavingsGoals",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavingsGoals_UserId_WalletId",
                table: "SavingsGoals",
                columns: new[] { "UserId", "WalletId" });

            migrationBuilder.CreateIndex(
                name: "IX_SavingsGoals_WalletId",
                table: "SavingsGoals",
                column: "WalletId");

            migrationBuilder.AddForeignKey(
                name: "FK_SavingsGoals_Wallets_WalletId",
                table: "SavingsGoals",
                column: "WalletId",
                principalTable: "Wallets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SavingsGoals_Wallets_WalletId",
                table: "SavingsGoals");

            migrationBuilder.DropIndex(
                name: "IX_SavingsGoals_UserId_WalletId",
                table: "SavingsGoals");

            migrationBuilder.DropIndex(
                name: "IX_SavingsGoals_WalletId",
                table: "SavingsGoals");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "SavingsGoals");

            migrationBuilder.DropColumn(
                name: "WalletId",
                table: "SavingsGoals");

            migrationBuilder.CreateIndex(
                name: "IX_SavingsGoals_UserId",
                table: "SavingsGoals",
                column: "UserId",
                unique: true);
        }
    }
}
