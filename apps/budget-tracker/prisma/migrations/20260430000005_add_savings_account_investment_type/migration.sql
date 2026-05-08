-- Add savings_account as an investment type
-- ALTER TYPE ... ADD VALUE is safe and additive in PostgreSQL
ALTER TYPE "BtInvestmentType" ADD VALUE IF NOT EXISTS 'savings_account';
