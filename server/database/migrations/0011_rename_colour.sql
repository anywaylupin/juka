-- groups.colour becomes groups.color, to match the code.
-- The rename was first made by editing 0007, which had already run everywhere that mattered, so every groups query failed with "no such column". An applied migration is never edited; this one does the rename instead.
ALTER TABLE `groups` RENAME COLUMN `colour` TO `color`;
