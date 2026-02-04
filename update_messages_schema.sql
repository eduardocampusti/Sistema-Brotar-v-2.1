-- Add type column to system_messages if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_messages' AND column_name = 'type') THEN
        ALTER TABLE system_messages ADD COLUMN type text DEFAULT 'ALERT';
    END IF;
END $$;

-- Update existing messages to be ALERTs (redundant due to default but good for clarity)
UPDATE system_messages SET type = 'ALERT' WHERE type IS NULL;

-- Enable Deletion Policy for Recipient (so they can clean up their inbox)
-- Drop if exists to avoid errors on re-run
DROP POLICY IF EXISTS "Recipients can delete their messages" ON system_messages;

CREATE POLICY "Recipients can delete their messages"
    ON system_messages FOR DELETE
    USING (auth.uid() = recipient_id);

-- Also allow Sender to delete? Usually yes for "unsend" or just cleanup sent box.
DROP POLICY IF EXISTS "Senders can delete their messages" ON system_messages;

CREATE POLICY "Senders can delete their messages"
    ON system_messages FOR DELETE
    USING (auth.uid() = sender_id);
    
-- Function to clean old read messages
create or replace function delete_expired_messages()
returns void
language plpgsql
security definer
as $$
begin
  delete from system_messages
  where type = 'MESSAGE'
  and is_read = true
  and read_at < (now() - interval '5 minutes');
end;
$$;
