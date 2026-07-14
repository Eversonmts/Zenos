-- Migração: Nova Arquitetura de Banco de Dados ZenOS v1.0
-- Foco: Precisão monetária, auditoria de potes, soft delete e performance.

-- 1. ADICIONAR COLUNAS DE SOFT DELETE E ATUALIZAR PRECISÃO MONETÁRIA
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.accounts ALTER COLUMN balance_initial TYPE DECIMAL(19,4);
ALTER TABLE public.accounts ALTER COLUMN current_balance TYPE DECIMAL(19,4);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar a tabela de Potes se ela não existir
CREATE TABLE IF NOT EXISTS public.pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (percentage >= 0 AND percentage <= 100),
    current_balance DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Habilitar RLS na tabela pots
ALTER TABLE public.pots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own pots" ON public.pots FOR ALL USING (auth.uid() = user_id);

-- Atualizar precisão monetária na tabela goals
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.goals ALTER COLUMN target_amount TYPE DECIMAL(19,4);
ALTER TABLE public.goals ALTER COLUMN current_amount TYPE DECIMAL(19,4);

-- Atualizar a tabela transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS pot_id UUID REFERENCES public.pots(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ALTER COLUMN amount TYPE DECIMAL(19,4);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('Realizado', 'Pendente')) DEFAULT 'Realizado';

-- 2. CRIAR TABELA DE REGISTRO HISTÓRICO DE RATEIO (POT ALLOCATIONS)
CREATE TABLE IF NOT EXISTS public.pot_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    pot_id UUID NOT NULL REFERENCES public.pots(id) ON DELETE CASCADE,
    amount DECIMAL(19,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em pot_allocations
ALTER TABLE public.pot_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view allocations of their own transactions" 
ON public.pot_allocations 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.transactions t 
        WHERE t.id = transaction_id AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert allocations of their own transactions" 
ON public.pot_allocations 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.transactions t 
        WHERE t.id = transaction_id AND t.user_id = auth.uid()
    )
);

-- 3. CRIAR ÍNDICES COMPOSITOS DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_transactions_perf_active 
ON public.transactions (user_id, date_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pot_allocations_tx 
ON public.pot_allocations (transaction_id);

-- 4. CRIAR TRIGGER DE RATEIO AUTOMÁTICO DE RECEITAS NOS POTES
CREATE OR REPLACE FUNCTION public.handle_auto_revenue_apportionment()
RETURNS trigger AS $$
DECLARE
    pot_record RECORD;
    allocated_sum DECIMAL(19,4) := 0.0000;
    share_amount DECIMAL(19,4) := 0.0000;
    total_pct DECIMAL(5,2) := 0.00;
    pots_count INTEGER := 0;
    current_idx INTEGER := 0;
BEGIN
    -- Só faz rateio de transações de Receita realizadas que não tenham pote ou conta específica
    IF NEW.type = 'income' AND NEW.status = 'Realizado' AND NEW.account_id IS NULL THEN
        -- Calcula o total de porcentagem dos potes ativos do usuário
        SELECT COALESCE(SUM(percentage), 0), COUNT(id) INTO total_pct, pots_count
        FROM public.pots 
        WHERE user_id = NEW.user_id AND deleted_at IS NULL AND percentage > 0;

        IF pots_count > 0 AND total_pct > 0 THEN
            -- Loop pelos potes ativos ordenados para distribuir as fatias
            FOR pot_record IN 
                SELECT id, percentage 
                FROM public.pots 
                WHERE user_id = NEW.user_id AND deleted_at IS NULL AND percentage > 0
                ORDER BY created_at ASC
            LOOP
                current_idx := current_idx + 1;
                
                -- Se for o último pote, aloca o resto para evitar erros de arredondamento de centavos
                IF current_idx = pots_count THEN
                    share_amount := NEW.amount - allocated_sum;
                ELSE
                    share_amount := ROUND((NEW.amount * (pot_record.percentage / total_pct))::numeric, 4);
                END IF;

                allocated_sum := allocated_sum + share_amount;

                -- Grava o histórico do aporte de rateio
                INSERT INTO public.pot_allocations (transaction_id, pot_id, amount)
                VALUES (NEW.id, pot_record.id, share_amount);

                -- Atualiza o saldo do pote
                UPDATE public.pots 
                SET current_balance = current_balance + share_amount,
                    updated_at = now()
                WHERE id = pot_record.id;
            END LOOP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger de inserção
DROP TRIGGER IF EXISTS trigger_auto_apportionment ON public.transactions;
CREATE TRIGGER trigger_auto_apportionment
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auto_revenue_apportionment();
