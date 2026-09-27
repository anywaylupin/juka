-- Groups, customisable rating names, and a cache for machine translated
-- Vietnamese meanings.
--
-- Left as drizzle-kit generated it, which is safe here: every statement is a
-- CREATE or an ADD COLUMN, so `cards` is never rebuilt and the three cards_fts
-- triggers are untouched. Compare migration 0002, which had to be hand written
-- for exactly that reason.
--
-- One thing this does NOT do: migration 0004 mapped the four old statuses onto
-- ratings 1, 2, 4, 5 at a time when there was no `new` level. The scale now
-- reads new, difficult, hesitant, good, mastered, so a box that came through
-- 0004 would read one level low. No such box exists, because the project has
-- never been deployed, so shifting every rating on a guess would risk more than
-- it fixes. If a real box is ever found in that state, correct it deliberately
-- rather than here.

CREATE TABLE `card_groups` (
	`card_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_groups_pair_idx` ON `card_groups` (`card_id`,`group_id`);--> statement-breakpoint
CREATE INDEX `card_groups_group_idx` ON `card_groups` (`group_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`colour` text DEFAULT '#8c7f76' NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `groups_user_order_idx` ON `groups` (`user_id`,`order_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `groups_user_name_idx` ON `groups` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `translations` (
	`hanzi` text NOT NULL,
	`locale` text NOT NULL,
	`text` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translations_key_idx` ON `translations` (`hanzi`,`locale`);--> statement-breakpoint
ALTER TABLE `users` ADD `rating_labels` text;