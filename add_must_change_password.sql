-- Add must_change_password column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

-- Update existing users to NOT require password change (so we don't lock everyone out)
UPDATE profiles 
SET must_change_password = FALSE 
WHERE must_change_password IS TRUE;

-- Trigger/Function (Optional but good practice) to set it to TRUE for NEW users is handled by DEFAULT TRUE.
-- However, we must ensure that when an Admin creates a user via the UI, this flag is set correctly.
-- Since the column has DEFAULT TRUE, new inserts will automatically have it as TRUE unless specified otherwise.
