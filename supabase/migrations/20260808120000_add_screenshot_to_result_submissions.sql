-- Migration: Add screenshot_base64 column to result_submissions table to support screenshot verification
ALTER TABLE public.result_submissions ADD COLUMN IF NOT EXISTS screenshot_base64 TEXT;
