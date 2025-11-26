-- Rename rollover_amount to rolloverAmount to match camelCase convention
ALTER TABLE budgets RENAME COLUMN rollover_amount TO "rolloverAmount";
