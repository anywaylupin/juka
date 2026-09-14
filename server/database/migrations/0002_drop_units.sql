-- Units are removed. Cards are one flat box, found by search and by filter.
--
-- Hand written rather than taken as drizzle-kit generated it. SQLite refuses
-- ALTER TABLE DROP COLUMN on a column that sits in a foreign key, so `cards`
-- has to be rebuilt. The generated version rebuilds it and stops there, which
-- would silently take the three `cards_fts` triggers down with the old table
-- and leave the search index mirroring nothing. The triggers are dropped and
-- recreated around the rebuild, and the index is rebuilt from the new table at
-- the end.
--
-- D1 rejects `PRAGMA foreign_keys` inside a transaction, so the deferred form
-- is used instead. `story_cards` references `cards(id)` and the rebuild keeps
-- every rowid, so nothing is orphaned either way.
PRAGMA defer_foreign_keys = on;--> statement-breakpoint

DROP TRIGGER `cards_fts_insert`;--> statement-breakpoint
DROP TRIGGER `cards_fts_delete`;--> statement-breakpoint
DROP TRIGGER `cards_fts_update`;--> statement-breakpoint

CREATE TABLE `__new_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint

-- The id is carried over explicitly, so rowids survive and `cards_fts`, which
-- is external content keyed on `content_rowid='id'`, still lines up.
INSERT INTO `__new_cards`("id", "user_id", "hanzi", "pinyin", "pinyin_plain", "han_viet", "hanzi_chars", "pinyin_search", "translation", "pos", "hsk_level", "status", "syllables", "notes", "created_at", "updated_at") SELECT "id", "user_id", "hanzi", "pinyin", "pinyin_plain", "han_viet", "hanzi_chars", "pinyin_search", "translation", "pos", "hsk_level", "status", "syllables", "notes", "created_at", "updated_at" FROM `cards`;--> statement-breakpoint

DROP TABLE `cards`;--> statement-breakpoint
ALTER TABLE `__new_cards` RENAME TO `cards`;--> statement-breakpoint

CREATE INDEX `cards_user_id_idx` ON `cards` (`user_id`,`id`);--> statement-breakpoint
CREATE INDEX `cards_user_status_idx` ON `cards` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `cards_user_syllables_idx` ON `cards` (`user_id`,`syllables`);--> statement-breakpoint
CREATE INDEX `cards_user_hsk_idx` ON `cards` (`user_id`,`hsk_level`);--> statement-breakpoint

-- Identical to the definitions in 0001. They have to be restated because the
-- table they were attached to no longer exists.
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

-- The rows moved without the triggers watching, so the index is restated from
-- the rebuilt table rather than trusted.
INSERT INTO `cards_fts`(`cards_fts`) VALUES ('rebuild');--> statement-breakpoint

DROP TABLE `units`;
