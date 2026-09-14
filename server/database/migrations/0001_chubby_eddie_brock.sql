CREATE TABLE `audio` (
	`hanzi_hash` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`voice` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`unit_id` integer,
	`hanzi` text NOT NULL,
	`pinyin` text DEFAULT '' NOT NULL,
	`pinyin_plain` text DEFAULT '' NOT NULL,
	`han_viet` text,
	`hanzi_chars` text DEFAULT '' NOT NULL,
	`pinyin_search` text DEFAULT '' NOT NULL,
	`translation` text DEFAULT '' NOT NULL,
	`pos` text,
	`hsk_level` integer,
	`status` text DEFAULT 'difficult' NOT NULL,
	`syllables` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `cards_user_id_idx` ON `cards` (`user_id`,`id`);--> statement-breakpoint
CREATE INDEX `cards_user_unit_idx` ON `cards` (`user_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `cards_user_status_idx` ON `cards` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `cards_user_syllables_idx` ON `cards` (`user_id`,`syllables`);--> statement-breakpoint
CREATE INDEX `cards_user_hsk_idx` ON `cards` (`user_id`,`hsk_level`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title_zh` text NOT NULL,
	`title_en` text DEFAULT '' NOT NULL,
	`hsk_level` integer,
	`body` text DEFAULT '' NOT NULL,
	`is_example` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stories_user_idx` ON `stories` (`user_id`,`id`);--> statement-breakpoint
CREATE TABLE `story_cards` (
	`story_id` integer NOT NULL,
	`card_id` integer NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `story_cards_pair_idx` ON `story_cards` (`story_id`,`card_id`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `units_user_order_idx` ON `units` (`user_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`theme` text DEFAULT 'ponkan' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
-- Search index. Per character tokenizing, not trigram: see docs/fts5-spike.md.
-- External content, so the text is stored once on cards and mirrored here.
CREATE VIRTUAL TABLE `cards_fts` USING fts5(
	hanzi_chars,
	pinyin_search,
	translation,
	han_viet,
	content='cards',
	content_rowid='id'
);--> statement-breakpoint
CREATE TRIGGER `cards_fts_insert` AFTER INSERT ON `cards` BEGIN
	INSERT INTO `cards_fts` (rowid, hanzi_chars, pinyin_search, translation, han_viet)
	VALUES (new.id, new.hanzi_chars, new.pinyin_search, new.translation, new.han_viet);
END;--> statement-breakpoint
CREATE TRIGGER `cards_fts_delete` AFTER DELETE ON `cards` BEGIN
	INSERT INTO `cards_fts` (`cards_fts`, rowid, hanzi_chars, pinyin_search, translation, han_viet)
	VALUES ('delete', old.id, old.hanzi_chars, old.pinyin_search, old.translation, old.han_viet);
END;--> statement-breakpoint
CREATE TRIGGER `cards_fts_update` AFTER UPDATE ON `cards` BEGIN
	INSERT INTO `cards_fts` (`cards_fts`, rowid, hanzi_chars, pinyin_search, translation, han_viet)
	VALUES ('delete', old.id, old.hanzi_chars, old.pinyin_search, old.translation, old.han_viet);
	INSERT INTO `cards_fts` (rowid, hanzi_chars, pinyin_search, translation, han_viet)
	VALUES (new.id, new.hanzi_chars, new.pinyin_search, new.translation, new.han_viet);
END;--> statement-breakpoint
-- Single owner until auth ships. requireUserId falls back to this row.
INSERT INTO `users` (`id`, `email`, `theme`) VALUES (1, 'owner@juka.local', 'ponkan');
