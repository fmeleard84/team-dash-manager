-- Enable realtime for time tracking tables
DO $$
BEGIN
  -- Check if active_time_tracking table exists and add to realtime
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'active_time_tracking'
  ) THEN
    -- Remove if already exists (to avoid errors)
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'active_time_tracking'
    ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE active_time_tracking;
    END IF;
    -- Add to realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE active_time_tracking;
    RAISE NOTICE 'Enabled realtime for active_time_tracking';
  END IF;

  -- Check if time_tracking_sessions table exists and add to realtime
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'time_tracking_sessions'
  ) THEN
    -- Remove if already exists (to avoid errors)
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'time_tracking_sessions'
    ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE time_tracking_sessions;
    END IF;
    -- Add to realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE time_tracking_sessions;
    RAISE NOTICE 'Enabled realtime for time_tracking_sessions';
  END IF;
END $$;