-- Ajout de la colonne is_favorite à la table collections
ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
