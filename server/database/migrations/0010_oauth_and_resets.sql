-- Signing in with a provider, and getting back in when the password is gone.
--
-- Hand written, because drizzle-kit emits `PRAGMA foreign_keys` around the
-- users rebuild and D1 rejects that inside a transaction. The rest of its
-- output is kept as it was generated.

-- 1. Accounts at GitHub or Google that sign in as one of our users. No token is
--    stored: the callback reads the profile once and drops it, because nothing
--    in the app ever calls a provider API afterwards.
CREATE TABLE `oauth_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`email` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_provider_account_idx` ON `oauth_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `oauth_user_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint

-- 2. Live password reset links, stored as a hash of the token rather than the
--    token, so this table is not a working key to every account.
CREATE TABLE `password_resets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `password_resets_token_idx` ON `password_resets` (`token_hash`);--> statement-breakpoint
CREATE INDEX `password_resets_user_idx` ON `password_resets` (`user_id`);--> statement-breakpoint

-- 3. Two accounts on one address makes "which account did you mean" impossible
--    to answer, and a reset link has to answer it. Any duplicate has to go
--    before the index can be built, and the newer row loses its address rather
--    than the account being deleted.
UPDATE `users`
SET `email` = NULL
WHERE `email` IS NOT NULL
	AND `id` NOT IN (SELECT MIN(`id`) FROM `users` WHERE `email` IS NOT NULL GROUP BY lower(`email`));--> statement-breakpoint
UPDATE `users` SET `email` = lower(`email`) WHERE `email` IS NOT NULL;--> statement-breakpoint

-- 4. password_hash becomes nullable, for an account that has only ever signed
--    in through a provider. Changing NOT NULL to nullable needs a table
--    rebuild, and cards, groups, stories, oauth_accounts and password_resets
--    all point here, so foreign keys are deferred rather than switched off:
--    that is the form D1 accepts inside a transaction. Ids carry over
--    unchanged, so nothing is orphaned.
PRAGMA defer_foreign_keys = on;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text,
	`email` text,
	`theme` text DEFAULT 'seville' NOT NULL,
	`rating_labels` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_users`("id", "username", "password_hash", "email", "theme", "rating_labels", "created_at")
SELECT "id", "username", "password_hash", "email", "theme", "rating_labels", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);
