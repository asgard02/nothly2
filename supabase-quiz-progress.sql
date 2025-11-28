-- Table pour suivre les performances des utilisateurs sur les quiz
-- Système d'apprentissage avec suivi pédagogique

-- Table principale de suivi des sessions de quiz
CREATE TABLE IF NOT EXISTS user_quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  study_collection_id uuid REFERENCES study_collections(id) ON DELETE CASCADE,
  quiz_question_ids uuid[] NOT NULL, -- IDs des questions dans cette session
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  incorrect_answers integer NOT NULL DEFAULT 0,
  skipped_answers integer NOT NULL DEFAULT 0,
  score_percentage numeric(5, 2), -- Score en pourcentage
  session_type text NOT NULL DEFAULT 'practice' CHECK (session_type IN ('practice', 'review', 'adaptive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_quiz_sessions_user_idx ON user_quiz_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_quiz_sessions_collection_idx ON user_quiz_sessions(study_collection_id);
CREATE INDEX IF NOT EXISTS user_quiz_sessions_completed_idx ON user_quiz_sessions(user_id, completed_at DESC) WHERE completed_at IS NOT NULL;

-- Table pour suivre chaque réponse individuelle
CREATE TABLE IF NOT EXISTS user_quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES user_quiz_sessions(id) ON DELETE CASCADE,
  quiz_question_id uuid NOT NULL, -- Référence à study_collection_quiz_questions
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_answer text, -- La réponse de l'utilisateur
  is_correct boolean NOT NULL,
  time_spent_seconds integer, -- Temps passé sur la question en secondes
  attempts_count integer NOT NULL DEFAULT 1, -- Nombre de tentatives pour cette question
  difficulty_level text CHECK (difficulty_level IN ('easy', 'medium', 'hard')), -- Niveau de difficulté perçu
  answered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_quiz_answers_session_idx ON user_quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS user_quiz_answers_question_idx ON user_quiz_answers(quiz_question_id);
CREATE INDEX IF NOT EXISTS user_quiz_answers_user_idx ON user_quiz_answers(user_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS user_quiz_answers_correct_idx ON user_quiz_answers(user_id, quiz_question_id, is_correct);

-- Table pour le suivi pédagogique global par question
-- Cette table agrège toutes les tentatives pour calculer les statistiques
CREATE TABLE IF NOT EXISTS quiz_question_stats (
  quiz_question_id uuid NOT NULL, -- Référence à study_collection_quiz_questions
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  total_attempts integer NOT NULL DEFAULT 0,
  correct_attempts integer NOT NULL DEFAULT 0,
  incorrect_attempts integer NOT NULL DEFAULT 0,
  average_time_seconds numeric(10, 2),
  last_attempted_at timestamptz,
  mastery_level text NOT NULL DEFAULT 'new' CHECK (mastery_level IN ('new', 'learning', 'reviewing', 'mastered')),
  -- Calculé: mastery_level basé sur le pourcentage de réussite
  -- new: jamais tenté
  -- learning: < 50% de réussite
  -- reviewing: 50-80% de réussite
  -- mastered: > 80% de réussite
  next_review_at timestamptz, -- Prochaine révision recommandée (algorithme de répétition espacée)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT quiz_question_stats_pkey PRIMARY KEY (quiz_question_id, user_id)
);

CREATE INDEX IF NOT EXISTS quiz_question_stats_user_idx ON quiz_question_stats(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS quiz_question_stats_review_idx ON quiz_question_stats(user_id, next_review_at) WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS quiz_question_stats_mastery_idx ON quiz_question_stats(user_id, mastery_level, updated_at DESC);

-- Table pour les tags/concepts difficiles (pour générer des questions ciblées)
CREATE TABLE IF NOT EXISTS user_weak_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  study_collection_id uuid REFERENCES study_collections(id) ON DELETE CASCADE,
  tag text NOT NULL, -- Tag/concept problématique
  difficulty_score numeric(5, 2) NOT NULL DEFAULT 0.0, -- Score de difficulté (0-100, plus élevé = plus difficile)
  questions_count integer NOT NULL DEFAULT 0, -- Nombre de questions avec ce tag qui ont été ratées
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, study_collection_id, tag)
);

CREATE INDEX IF NOT EXISTS user_weak_areas_user_idx ON user_weak_areas(user_id, study_collection_id, difficulty_score DESC);
CREATE INDEX IF NOT EXISTS user_weak_areas_collection_idx ON user_weak_areas(study_collection_id, difficulty_score DESC);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_quiz_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les triggers s'ils existent déjà, puis les recréer
DROP TRIGGER IF EXISTS user_quiz_sessions_update_timestamp ON user_quiz_sessions;
CREATE TRIGGER user_quiz_sessions_update_timestamp
  BEFORE UPDATE ON user_quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_timestamp();

DROP TRIGGER IF EXISTS quiz_question_stats_update_timestamp ON quiz_question_stats;
CREATE TRIGGER quiz_question_stats_update_timestamp
  BEFORE UPDATE ON quiz_question_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_timestamp();

-- Fonction pour calculer automatiquement le mastery_level
CREATE OR REPLACE FUNCTION calculate_mastery_level(
  correct_count integer,
  total_count integer
) RETURNS text AS $$
DECLARE
  success_rate numeric;
BEGIN
  IF total_count = 0 THEN
    RETURN 'new';
  END IF;
  
  success_rate := (correct_count::numeric / total_count::numeric) * 100;
  
  IF success_rate >= 80 THEN
    RETURN 'mastered';
  ELSIF success_rate >= 50 THEN
    RETURN 'reviewing';
  ELSE
    RETURN 'learning';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer next_review_at (répétition espacée simplifiée)
CREATE OR REPLACE FUNCTION calculate_next_review(
  mastery_level text,
  last_attempted_at timestamptz,
  incorrect_count integer
) RETURNS timestamptz AS $$
DECLARE
  days_to_add integer;
BEGIN
  CASE mastery_level
    WHEN 'mastered' THEN
      days_to_add := 30; -- Révision dans 30 jours si maîtrisé
    WHEN 'reviewing' THEN
      days_to_add := 7; -- Révision dans 7 jours
    WHEN 'learning' THEN
      days_to_add := 1; -- Révision le lendemain
    ELSE
      days_to_add := 1; -- Par défaut, révision le lendemain
  END CASE;
  
  -- Si beaucoup d'erreurs, réduire l'intervalle
  IF incorrect_count > 3 THEN
    days_to_add := GREATEST(1, days_to_add - 1);
  END IF;
  
  RETURN COALESCE(last_attempted_at, now()) + (days_to_add || ' days')::interval;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_quiz_sessions IS 'Sessions de quiz complètes avec statistiques globales';
COMMENT ON TABLE user_quiz_answers IS 'Réponses individuelles aux questions de quiz';
COMMENT ON TABLE quiz_question_stats IS 'Statistiques agrégées par question pour chaque utilisateur (suivi pédagogique)';
COMMENT ON TABLE user_weak_areas IS 'Zones de difficulté identifiées par tag/concept pour générer des questions ciblées';

