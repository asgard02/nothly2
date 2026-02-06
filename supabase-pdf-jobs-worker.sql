-- Migration: support worker cloud pour le chunking PDF (async_jobs)
-- À exécuter dans l’éditeur SQL Supabase si la colonne n’existe pas déjà.

-- Colonne attempts pour retries (optionnel)
ALTER TABLE async_jobs
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

-- Index déjà présents dans supabase-add-tables.sql (à garder) :
-- async_jobs_polling_idx ON async_jobs(status, type, created_at ASC) WHERE status = 'pending';

-- Commentaire pour rappel
COMMENT ON COLUMN async_jobs.attempts IS 'Nombre de tentatives de traitement (worker document-generation).';
