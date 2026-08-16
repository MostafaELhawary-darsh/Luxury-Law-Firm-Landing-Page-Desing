/*
# Create contact_requests table (single-tenant, no auth)

1. New Tables
- `contact_requests`
  - `id` (uuid, primary key)
  - `name` (text, not null) — full name of the person requesting a strategic meeting
  - `email` (text, not null) — contact email for follow-up
  - `created_at` (timestamptz, default now()) — when the request was submitted
2. Security
- Enable RLS on `contact_requests`.
- Allow anon + authenticated INSERT only (public can submit requests, but cannot read/update/delete them).
- SELECT/UPDATE/DELETE restricted to authenticated (service role / admin) for follow-up management.
*/

CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to insert new contact requests
DROP POLICY IF EXISTS "anon_insert_contact_requests" ON contact_requests;
CREATE POLICY "anon_insert_contact_requests" ON contact_requests FOR INSERT
TO anon, authenticated WITH CHECK (true);

-- Only authenticated users (admins) can view requests
DROP POLICY IF EXISTS "auth_select_contact_requests" ON contact_requests;
CREATE POLICY "auth_select_contact_requests" ON contact_requests FOR SELECT
TO authenticated USING (true);

-- Only authenticated users (admins) can update requests
DROP POLICY IF EXISTS "auth_update_contact_requests" ON contact_requests;
CREATE POLICY "auth_update_contact_requests" ON contact_requests FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- Only authenticated users (admins) can delete requests
DROP POLICY IF EXISTS "auth_delete_contact_requests" ON contact_requests;
CREATE POLICY "auth_delete_contact_requests" ON contact_requests FOR DELETE
TO authenticated USING (true);
