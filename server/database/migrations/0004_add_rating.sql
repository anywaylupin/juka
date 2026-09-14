-- The four named statuses become a 0 to 5 rating, drawn as mandarins. Added
-- here and backfilled; `status` itself is dropped in 0005, so the two halves
-- are separable and this one is safe to apply on its own.
ALTER TABLE `cards` ADD `rating` integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- The old scale had no middle, so 3 is deliberately skipped rather than
-- inventing a precision the data never had.
UPDATE `cards` SET `rating` = CASE `status`
	WHEN 'difficult' THEN 1
	WHEN 'hesitant' THEN 2
	WHEN 'good' THEN 4
	WHEN 'mastered' THEN 5
	ELSE 0
END;--> statement-breakpoint

CREATE INDEX `cards_user_rating_idx` ON `cards` (`user_id`,`rating`);