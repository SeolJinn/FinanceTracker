using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FinanceTrackerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddWalletsAndWalletIdToTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WalletId",
                table: "Transactions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Wallets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Wallets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Wallets_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_WalletId",
                table: "Transactions",
                column: "WalletId");

            migrationBuilder.CreateIndex(
                name: "IX_Wallets_UserId_Name",
                table: "Wallets",
                columns: new[] { "UserId", "Name" },
                unique: true);

            // Seed a default wallet per user and backfill existing transactions
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    -- Create a default 'Main' USD wallet for each user if none exists
                    INSERT INTO ""Wallets"" (""UserId"", ""Name"", ""CurrencyCode"", ""CreatedAt"", ""UpdatedAt"")
                    SELECT u.""Id"", 'Main', 'USD', NOW(), NOW()
                    FROM ""Users"" u
                    WHERE NOT EXISTS (
                        SELECT 1 FROM ""Wallets"" w WHERE w.""UserId"" = u.""Id""
                    );

                    -- Set WalletId on existing transactions to the user's default wallet
                    UPDATE ""Transactions"" t
                    SET ""WalletId"" = w.""Id""
                    FROM (
                        SELECT w1.* FROM ""Wallets"" w1
                        JOIN (
                            SELECT ""UserId"", MIN(""Id"") AS min_id FROM ""Wallets"" GROUP BY ""UserId""
                        ) x ON x.min_id = w1.""Id""
                    ) w
                    WHERE t.""WalletId"" IS NULL AND t.""UserId"" = w.""UserId"";
                END $$;
            ");

            // Now enforce non-null and FK with cascade
            migrationBuilder.AlterColumn<int>(
                name: "WalletId",
                table: "Transactions",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Wallets_WalletId",
                table: "Transactions",
                column: "WalletId",
                principalTable: "Wallets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Wallets_WalletId",
                table: "Transactions");

            migrationBuilder.DropTable(
                name: "Wallets");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_WalletId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "WalletId",
                table: "Transactions");
        }
    }
}
