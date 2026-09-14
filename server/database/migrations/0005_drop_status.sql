-- Drops the old status column, now that 0004 has backfilled `rating` from it.
--
-- Left as drizzle-kit generated it, which is safe here: `status` sits in no
-- foreign key, so SQLite drops it in place rather than rebuilding the table.
-- That matters because a rebuild would take the three `cards_fts` triggers with
-- it, which is why migration 0002 had to be written by hand.
DROP INDEX `cards_user_status_idx`;--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `status`;