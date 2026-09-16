-- The Vietnamese meaning is a dictionary lookup now, not an inference, so the
-- cache that stood in for one has nothing left to hold. See migration 0008,
-- which added cards.translation_vi.

DROP TABLE `translations`;