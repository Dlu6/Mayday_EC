-- Migration: Add pause-related columns to database tables
-- Run this on the asterisk database (65.1.149.92)

-- Add paused_reason column to queue_members table
ALTER TABLE queue_members 
ADD COLUMN IF NOT EXISTS paused_reason VARCHAR(100) NULL 
COMMENT 'Reason for pause (e.g., BREAK, LUNCH, MEETING)';

-- Add autoUnpaused column to agent_pause_logs table
ALTER TABLE agent_pause_logs 
ADD COLUMN IF NOT EXISTS autoUnpaused TINYINT(1) DEFAULT 0 
COMMENT 'Whether the agent was auto-unpaused due to max duration';

-- Verify the changes
DESCRIBE queue_members;
DESCRIBE agent_pause_logs;
