-- Real accounts, and the end of the HSK column.
--
-- Hand written. drizzle-kit's version of this fails three ways: it selects
-- `username` and `password_hash` out of the old `users` table before those
-- columns exist, it uses `PRAGMA foreign_keys` which D1 rejects inside a
-- transaction, and it creates the unique index on cards without deduplicating
-- first.

-- 1. The word insight cache. Nothing reads it any more: the bundled dictionary
--    answers the reading, the meaning and the part of speech, and the HSK band
--    is gone, so there is nothing left for a model to say.
DROP TABLE `insights`;--> statement-breakpoint

-- 2. HSK level. Not referenced by any trigger, and its only index is dropped
--    first, so SQLite drops the column in place and the cards_fts triggers live.
DROP INDEX `cards_user_hsk_idx`;--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `hsk_level`;--> statement-breakpoint

-- 3. One card per word per owner.
--    Any existing duplicate has to go before the index can be built. The oldest
--    row wins, because it is the one the user has been rating.
DELETE FROM `cards`
WHERE `id` NOT IN (SELECT MIN(`id`) FROM `cards` GROUP BY `user_id`, `hanzi`);--> statement-breakpoint
CREATE UNIQUE INDEX `cards_user_hanzi_idx` ON `cards` (`user_id`,`hanzi`);--> statement-breakpoint

-- 4. users gains a username and a password, and email becomes optional.
--    Changing a column from NOT NULL to nullable needs a table rebuild.
--    `cards.user_id` points here, so foreign keys are deferred rather than
--    switched off, which is the form D1 accepts inside a transaction. Ids are
--    carried over unchanged, so nothing is orphaned.
PRAGMA defer_foreign_keys = on;--> statement-breakpoint

CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`email` text,
	`theme` text DEFAULT 'seville' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint

-- The bootstrap owner from migration 0001 has no password, because there was no
-- auth to have one for. It is carried across as a claimable row: '!' is not a
-- valid scrypt string, so verifyPassword can never match it and the account
-- cannot be signed into until someone sets a password on it deliberately.
INSERT INTO `__new_users`("id", "username", "password_hash", "email", "theme", "created_at")
SELECT
	"id",
	'owner',
	'!',
	NULLIF("email", 'owner@juka.local'),
	"theme",
	"created_at"
FROM `users`;--> statement-breakpoint

DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint

-- If that bootstrap row never held a card, it is simply noise now: an account
-- nobody can sign into, occupying the one username someone might want. It is
-- removed only when it owns nothing, so this can never take data with it.
DELETE FROM `users`
WHERE `password_hash` = '!'
	AND NOT EXISTS (SELECT 1 FROM `cards` WHERE `cards`.`user_id` = `users`.`id`);
