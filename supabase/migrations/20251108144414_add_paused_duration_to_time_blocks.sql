ALTER TABLE public.time_blocks
  ADD COLUMN IF NOT EXISTS paused_duration BIGINT DEFAULT 0;

COMMENT ON COLUMN public.time_blocks.paused_duration IS 'Stores accumulated paused time in milliseconds';
