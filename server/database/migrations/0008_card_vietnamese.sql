-- A card's meaning in Vietnamese, pivoted through its English gloss by the
-- bundled dictionary and editable afterwards.
--
-- Left as drizzle-kit generated it: a single ADD COLUMN never rebuilds `cards`,
-- so the three cards_fts triggers are untouched.
ALTER TABLE `cards` ADD `translation_vi` text;