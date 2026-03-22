-- Add stock column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 1;

-- If it's a "sale", we might want to have at least 1 in stock by default
UPDATE listings SET stock = 1 WHERE is_sellable = TRUE AND stock IS NULL;
