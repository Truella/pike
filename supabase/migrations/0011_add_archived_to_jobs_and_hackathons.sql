-- Add archived column to jobs_listings and hackathons_entries
ALTER TABLE jobs_listings
ADD COLUMN archived boolean NOT NULL DEFAULT false;

ALTER TABLE hackathons_entries
ADD COLUMN archived boolean NOT NULL DEFAULT false;
