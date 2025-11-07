-- 🔄 TRIGGERS POUR MISE À JOUR AUTOMATIQUE DE updated_at
-- À exécuter dans Supabase SQL Editor

-- Fonction pour mettre à jour updated_at (déjà créée pour user_credits, réutilisable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la table notes
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vérification
-- SELECT trigger_name, event_object_table, event_manipulation 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'notes';



