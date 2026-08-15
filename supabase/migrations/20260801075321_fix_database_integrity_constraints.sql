-- Fix missing indexes on foreign keys (performance)
CREATE INDEX IF NOT EXISTS idx_lf_fee_agreements_matter_id ON lf_fee_agreements(matter_id);
CREATE INDEX IF NOT EXISTS idx_lf_invoice_items_invoice_id ON lf_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_lf_invoice_items_time_entry_id ON lf_invoice_items(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_lf_disbursements_invoice_id ON lf_disbursements(invoice_id);
CREATE INDEX IF NOT EXISTS idx_lt_attorney_profiles_attorney_id ON lt_attorney_profiles(lf_attorney_id);

-- Fix missing UNIQUE constraints on business identifiers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uniq_lf_cases_case_number') THEN
    ALTER TABLE lf_cases ADD CONSTRAINT uniq_lf_cases_case_number UNIQUE (case_number);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uniq_lf_poa_poa_number') THEN
    ALTER TABLE lf_poa ADD CONSTRAINT uniq_lf_poa_poa_number UNIQUE (poa_number);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uniq_lf_checks_check_number') THEN
    ALTER TABLE lf_checks ADD CONSTRAINT uniq_lf_checks_check_number UNIQUE (check_number);
  END IF;
END $$;

-- Fix missing CHECK constraints for data integrity
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lf_time_entries_hours_positive') THEN
    ALTER TABLE lf_time_entries ADD CONSTRAINT chk_lf_time_entries_hours_positive CHECK (hours > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_laas_wallets_balance_nonneg') THEN
    ALTER TABLE laas_wallets ADD CONSTRAINT chk_laas_wallets_balance_nonneg CHECK (balance >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lt_internal_notes_risk_range') THEN
    ALTER TABLE lt_internal_notes ADD CONSTRAINT chk_lt_internal_notes_risk_range CHECK (risk_percentage >= 0 AND risk_percentage <= 100);
  END IF;
END $$;

-- Revoke EXECUTE on purge procedure from anon/authenticated (defense in depth)
REVOKE EXECUTE ON PROCEDURE secure_purge_unmasking_maps() FROM anon, authenticated;
