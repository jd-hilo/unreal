/*
  # Clear Decisions and Simulations for User with Mora# 111111
  
  ## Description
  Deletes all decisions, simulations, decision_chats, what_if, and career_simulations
  for the user with twin_code (Mora#) 111111.
  
  ## WARNING - DESTRUCTIVE OPERATION
  This script PERMANENTLY DELETES data. Use with extreme caution.
  
  ## Usage:
  1. First run in DRY_RUN mode to see what would be deleted:
     SET app.clear_user_data_dry_run = true;
     SET app.clear_user_data_confirm = false;
  
  2. To actually delete, you MUST set both:
     SET app.clear_user_data_dry_run = false;
     SET app.clear_user_data_confirm = true;
  
  ## Safety Features:
  - Requires explicit confirmation flag
  - Dry-run mode shows counts without deleting
  - Will not execute if confirmation is not set
*/

-- Find user_id from twin_code
DO $$
DECLARE
  target_user_id uuid;
  target_user_name text;
  deleted_decisions_count integer;
  deleted_simulations_count integer;
  deleted_decision_chats_count integer;
  deleted_what_if_count integer;
  deleted_career_simulations_count integer;
  dry_run boolean;
  confirmed boolean;
  decisions_count integer;
  simulations_count integer;
  decision_chats_count integer;
  what_if_count integer;
  career_simulations_count integer;
BEGIN
  -- Check if dry run mode is enabled (defaults to true for safety)
  BEGIN
    dry_run := current_setting('app.clear_user_data_dry_run') = 'true';
  EXCEPTION WHEN OTHERS THEN
    dry_run := true; -- Default to dry run for safety
  END;
  
  -- Check if confirmed (defaults to false for safety)
  BEGIN
    confirmed := current_setting('app.clear_user_data_confirm') = 'true';
  EXCEPTION WHEN OTHERS THEN
    confirmed := false; -- Default to not confirmed for safety
  END;
  
  -- Get user_id from twin_code
  SELECT user_id, first_name INTO target_user_id, target_user_name
  FROM profiles
  WHERE twin_code = '111111';
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'No user found with twin_code 111111';
    RETURN;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'USER DATA CLEANUP SCRIPT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User ID: %', target_user_id;
  RAISE NOTICE 'User Name: %', COALESCE(target_user_name, 'Unknown');
  RAISE NOTICE 'Mora#: 111111';
  RAISE NOTICE 'Dry Run Mode: %', dry_run;
  RAISE NOTICE 'Confirmed: %', confirmed;
  RAISE NOTICE '========================================';
  
  -- Count existing records
  SELECT COUNT(*) INTO decisions_count FROM decisions WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO simulations_count FROM simulations WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO decision_chats_count FROM decision_chats WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO what_if_count FROM what_if WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO career_simulations_count FROM career_simulations WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Current record counts:';
  RAISE NOTICE '  - Decisions: %', decisions_count;
  RAISE NOTICE '  - Simulations: %', simulations_count;
  RAISE NOTICE '  - Decision Chats: %', decision_chats_count;
  RAISE NOTICE '  - What-If Records: %', what_if_count;
  RAISE NOTICE '  - Career Simulations: %', career_simulations_count;
  RAISE NOTICE '========================================';
  
  -- Safety check: require explicit confirmation
  IF NOT confirmed THEN
    RAISE EXCEPTION 'SAFETY CHECK FAILED: You must set app.clear_user_data_confirm = true to execute deletions. This prevents accidental data loss.';
  END IF;
  
  -- If dry run, just show what would be deleted
  IF dry_run THEN
    RAISE NOTICE 'DRY RUN MODE - No data will be deleted';
    RAISE NOTICE 'To actually delete, run:';
    RAISE NOTICE '  SET app.clear_user_data_dry_run = false;';
    RAISE NOTICE '  SET app.clear_user_data_confirm = true;';
    RAISE NOTICE 'Then re-run this script.';
    RETURN;
  END IF;
  
  -- Actually delete (only reaches here if confirmed and not dry run)
  RAISE NOTICE 'DELETING DATA...';
  
  -- Delete decision_chats first (references decisions)
  DELETE FROM decision_chats
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_decision_chats_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % decision_chats', deleted_decision_chats_count;
  
  -- Delete simulations (references decisions)
  DELETE FROM simulations
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_simulations_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % simulations', deleted_simulations_count;
  
  -- Delete decisions
  DELETE FROM decisions
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_decisions_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % decisions', deleted_decisions_count;
  
  -- Delete what_if records
  DELETE FROM what_if
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_what_if_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % what_if records', deleted_what_if_count;
  
  -- Delete career_simulations
  DELETE FROM career_simulations
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_career_simulations_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % career_simulations', deleted_career_simulations_count;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup complete for user with Mora# 111111';
  RAISE NOTICE '========================================';
END $$;
