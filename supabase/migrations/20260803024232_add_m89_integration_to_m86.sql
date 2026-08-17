/*
# Add M89 Security Integration to M86 Tourism Engine

## Overview
Adds `m89_security_linked` boolean column to the `m86_tourism_files` table to track integration
with the M89 Security Engine for guest permits and hotel security requirements.

## Changes
- `m86_tourism_files`: new column `m89_security_linked` (boolean, default false)

## Security
- No RLS policy changes needed — existing policies already cover the new column.
*/

ALTER TABLE m86_tourism_files
  ADD COLUMN IF NOT EXISTS m89_security_linked boolean NOT NULL DEFAULT false;