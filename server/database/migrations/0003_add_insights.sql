CREATE TABLE `insights` (
	`hanzi` text PRIMARY KEY NOT NULL,
	`pos` text,
	`hsk_level` integer,
	`related` text DEFAULT '[]' NOT NULL,
	`model` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
