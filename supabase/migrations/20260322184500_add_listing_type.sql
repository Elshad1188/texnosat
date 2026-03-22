-- Add is_sellable column to listings table
-- This allows store owners to choose between a classic "Ad" or a direct "Sale"

ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_sellable BOOLEAN DEFAULT FALSE;

-- Update existing store listings to be sellable by default (migration)
-- This keeps existing functionality for current store items
UPDATE listings SET is_sellable = TRUE WHERE store_id IS NOT NULL;
