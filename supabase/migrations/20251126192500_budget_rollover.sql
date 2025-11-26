-- Add rollover_amount to budgets
ALTER TABLE budgets ADD COLUMN rollover_amount numeric DEFAULT 0;

-- Add preferences to profiles (using JSONB for flexibility)
ALTER TABLE profiles ADD COLUMN preferences jsonb DEFAULT '{}'::jsonb;
