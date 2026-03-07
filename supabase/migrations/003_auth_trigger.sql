-- ============================================================================
-- MIGRATION 003: Auth-to-Customer Trigger
-- ============================================================================
-- Automatically creates a customer record when a user confirms their email
-- Pulls metadata (full_name, business_name) from Supabase Auth signup

-- Drop trigger and function if they exist (for re-running migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new customer record
  INSERT INTO public.customers (
    auth_user_id,
    email,
    name,
    company,
    status,
    lifetime_value,
    health_score,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'business_name',
    'active',
    0.0,
    100,
    jsonb_build_object(
      'signup_source', 'auth_signup',
      'created_at', NEW.created_at,
      'confirmed_at', NEW.confirmed_at
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
-- Fires AFTER INSERT on auth.users (when user confirms email)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
