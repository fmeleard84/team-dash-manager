-- Enable realtime for all critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.task_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_event_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.project_files;

-- Create trigger function to create notifications for new task ratings
CREATE OR REPLACE FUNCTION notify_on_task_rating() 
RETURNS TRIGGER AS $$
DECLARE
  card_data RECORD;
  project_data RECORD;
  candidate_data RECORD;
BEGIN
  -- Get card details
  SELECT * INTO card_data FROM kanban_cards WHERE id = NEW.task_id;
  
  -- Get project details
  IF card_data.kanban_board_id IS NOT NULL THEN
    SELECT p.* INTO project_data 
    FROM projects p
    JOIN kanban_boards kb ON kb.project_id = p.id
    WHERE kb.id = card_data.kanban_board_id;
  END IF;
  
  -- Get candidate details
  SELECT * INTO candidate_data FROM candidate_profiles WHERE id = NEW.candidate_id;
  
  -- Create notification for candidate
  IF candidate_data.email IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      description,
      data,
      priority,
      created_at
    ) 
    SELECT 
      au.id,
      'task_rating',
      'Nouvelle note sur votre tâche',
      'La tâche "' || COALESCE(card_data.title, 'Sans titre') || '" a reçu une note de ' || NEW.rating || ' étoiles',
      jsonb_build_object(
        'task_id', NEW.task_id,
        'rating', NEW.rating,
        'project_id', project_data.id,
        'project_name', project_data.name
      ),
      'medium',
      NOW()
    FROM auth.users au
    WHERE au.email = candidate_data.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_on_task_rating ON task_ratings;

-- Create trigger for task ratings
CREATE TRIGGER trigger_notify_on_task_rating
  AFTER INSERT ON task_ratings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_task_rating();

-- Create trigger function to create notifications for new messages
CREATE OR REPLACE FUNCTION notify_on_new_message() 
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  project_data RECORD;
BEGIN
  -- Get project details
  SELECT * INTO project_data FROM projects WHERE id = NEW.project_id;
  
  -- Get sender name
  SELECT COALESCE(raw_user_meta_data->>'firstName', email) INTO sender_name
  FROM auth.users 
  WHERE id = NEW.sender_id;
  
  -- Find all recipients (project members except sender)
  FOR recipient_id IN 
    SELECT DISTINCT unnest(ARRAY[
      project_data.client_id,
      project_data.manager_id
    ]) AS user_id
    WHERE user_id IS NOT NULL AND user_id != NEW.sender_id
  LOOP
    -- Create notification for each recipient
    INSERT INTO notifications (
      user_id,
      type,
      title,
      description,
      data,
      priority,
      created_at
    ) VALUES (
      recipient_id,
      'new_message',
      'Nouveau message',
      sender_name || ' a envoyé un message dans le projet "' || COALESCE(project_data.name, 'Sans nom') || '"',
      jsonb_build_object(
        'message_id', NEW.id,
        'project_id', NEW.project_id,
        'project_name', project_data.name,
        'sender_name', sender_name
      ),
      'medium',
      NOW()
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;

-- Create trigger for messages
CREATE TRIGGER trigger_notify_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();

-- Create trigger function for new project notifications
CREATE OR REPLACE FUNCTION notify_on_new_project() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for "Nouvelle demande" status
  IF NEW.status = 'Nouvelle demande' THEN
    -- Create notification for manager if assigned
    IF NEW.manager_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        description,
        data,
        priority,
        created_at
      ) VALUES (
        NEW.manager_id,
        'new_project',
        'Nouveau projet créé',
        'Le projet "' || COALESCE(NEW.name, 'Sans nom') || '" a été créé',
        jsonb_build_object(
          'project_id', NEW.id,
          'project_name', NEW.name,
          'client_id', NEW.client_id
        ),
        'high',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_on_new_project ON projects;

-- Create trigger for new projects
CREATE TRIGGER trigger_notify_on_new_project
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_project();

-- Create trigger function for project status changes
CREATE OR REPLACE FUNCTION notify_on_project_status_change() 
RETURNS TRIGGER AS $$
BEGIN
  -- Notify when project is started
  IF NEW.status = 'started' AND (OLD.status IS NULL OR OLD.status != 'started') THEN
    -- Notify client
    IF NEW.client_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        description,
        data,
        priority,
        created_at
      ) VALUES (
        NEW.client_id,
        'project_started',
        'Projet démarré',
        'Le projet "' || COALESCE(NEW.name, 'Sans nom') || '" a été démarré',
        jsonb_build_object(
          'project_id', NEW.id,
          'project_name', NEW.name
        ),
        'high',
        NOW()
      );
    END IF;
    
    -- Notify manager
    IF NEW.manager_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        description,
        data,
        priority,
        created_at
      ) VALUES (
        NEW.manager_id,
        'project_started',
        'Projet démarré',
        'Le projet "' || COALESCE(NEW.name, 'Sans nom') || '" a été démarré',
        jsonb_build_object(
          'project_id', NEW.id,
          'project_name', NEW.name
        ),
        'medium',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_on_project_status_change ON projects;

-- Create trigger for project status changes
CREATE TRIGGER trigger_notify_on_project_status_change
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_project_status_change();

-- Create trigger function for kanban card assignments
CREATE OR REPLACE FUNCTION notify_on_card_assignment() 
RETURNS TRIGGER AS $$
DECLARE
  board_data RECORD;
  project_data RECORD;
  assigned_user TEXT;
  user_email TEXT;
  user_data RECORD;
BEGIN
  -- Only process if assigned_to has changed and is not empty
  IF (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) AND NEW.assigned_to IS NOT NULL AND array_length(NEW.assigned_to, 1) > 0 THEN
    
    -- Get board and project details
    SELECT * INTO board_data FROM kanban_boards WHERE id = NEW.kanban_board_id;
    IF board_data.project_id IS NOT NULL THEN
      SELECT * INTO project_data FROM projects WHERE id = board_data.project_id;
    END IF;
    
    -- Check each assigned user
    FOREACH assigned_user IN ARRAY NEW.assigned_to
    LOOP
      -- Skip if user was already assigned
      IF OLD.assigned_to IS NULL OR NOT (assigned_user = ANY(OLD.assigned_to)) THEN
        -- Try to extract email from assigned_user string
        -- Format could be "Name (email)" or "Name - Role" or just "email"
        IF assigned_user LIKE '%@%' THEN
          -- Extract email if present
          IF assigned_user LIKE '%(%@%)%' THEN
            -- Format: "Name (email)"
            user_email := substring(assigned_user from '\(([^)]+@[^)]+)\)');
          ELSE
            -- Direct email or "email - Role"
            user_email := split_part(assigned_user, ' - ', 1);
          END IF;
          
          -- Find user by email
          SELECT * INTO user_data FROM auth.users WHERE email = user_email;
          
          IF user_data.id IS NOT NULL THEN
            INSERT INTO notifications (
              user_id,
              type,
              title,
              description,
              data,
              priority,
              created_at
            ) VALUES (
              user_data.id,
              'card_assigned',
              'Nouvelle tâche assignée',
              'La tâche "' || COALESCE(NEW.title, 'Sans titre') || '" vous a été assignée',
              jsonb_build_object(
                'card_id', NEW.id,
                'card_title', NEW.title,
                'project_id', project_data.id,
                'project_name', project_data.name,
                'board_id', NEW.kanban_board_id
              ),
              'high',
              NOW()
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_on_card_assignment ON kanban_cards;

-- Create trigger for card assignments
CREATE TRIGGER trigger_notify_on_card_assignment
  AFTER UPDATE ON kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_card_assignment();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_task_rating() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_new_message() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_new_project() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_project_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_card_assignment() TO authenticated;