-- 1. Add columns to debts if they don't exist
ALTER TABLE public.debts 
ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS parent_debt_id UUID REFERENCES public.debts(id);

-- 2. Create transaction_requests table
CREATE TABLE IF NOT EXISTS public.transaction_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sender_user_id uuid not null, -- FK will be added later to point to profiles
  receiver_user_id uuid not null, -- FK will be added later to point to profiles
  related_debt_id uuid references public.debts(id) on delete set null,
  amount numeric not null,
  currency text not null,
  category_name text,
  description text,
  status text default 'PENDING' check (status in ('PENDING', 'COMPLETED', 'REJECTED')),
  transaction_type text not null -- 'INCOME' or 'EXPENSE'
);

-- 3. Fix Foreign Keys to point to profiles (required for PostgREST joins)
-- First drop existing constraints if any (to be safe)
ALTER TABLE public.transaction_requests
DROP CONSTRAINT IF EXISTS transaction_requests_sender_user_id_fkey,
DROP CONSTRAINT IF EXISTS transaction_requests_receiver_user_id_fkey;

-- Add constraints referencing profiles
ALTER TABLE public.transaction_requests
ADD CONSTRAINT transaction_requests_sender_user_id_fkey 
FOREIGN KEY (sender_user_id) 
REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.transaction_requests
ADD CONSTRAINT transaction_requests_receiver_user_id_fkey 
FOREIGN KEY (receiver_user_id) 
REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Enable RLS
ALTER TABLE public.transaction_requests ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can see their own requests" ON public.transaction_requests;
CREATE POLICY "Users can see their own requests" ON public.transaction_requests
FOR SELECT USING (auth.uid() = sender_user_id OR auth.uid() = receiver_user_id);

DROP POLICY IF EXISTS "Users can insert requests" ON public.transaction_requests;
CREATE POLICY "Users can insert requests" ON public.transaction_requests
FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

DROP POLICY IF EXISTS "Users can update incoming requests" ON public.transaction_requests;
CREATE POLICY "Users can update incoming requests" ON public.transaction_requests
FOR UPDATE USING (auth.uid() = receiver_user_id);

-- 6. Function: link_debt_partners
CREATE OR REPLACE FUNCTION public.link_debt_partners(
  debt_id_user1 UUID,
  debt_id_user2 UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user1_id UUID;
  user2_id UUID;
BEGIN
  SELECT telegram_user_id INTO user1_id FROM public.debts WHERE id = debt_id_user1;
  SELECT telegram_user_id INTO user2_id FROM public.debts WHERE id = debt_id_user2;

  UPDATE public.debts 
  SET linked_user_id = user2_id 
  WHERE id = debt_id_user1;

  UPDATE public.debts 
  SET linked_user_id = user1_id, parent_debt_id = debt_id_user1
  WHERE id = debt_id_user2;
END;
$$;

-- 7. Function: get_shared_debt
CREATE OR REPLACE FUNCTION public.get_shared_debt(lookup_debt_id uuid)
 RETURNS TABLE(
    id uuid,
    owner_name text, 
    amount numeric,
    currency text,
    type text,
    description text
 )
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT
        d.id,
        COALESCE(p.full_name, 'Неизвестный пользователь') AS owner_name, 
        d.amount,
        d.currency,
        d.type::text AS type, 
        d.description
    FROM
        public.debts d
    LEFT JOIN
        public.profiles p ON d.telegram_user_id = p.id
    WHERE
        d.id = lookup_debt_id
    LIMIT 1;
$function$;
