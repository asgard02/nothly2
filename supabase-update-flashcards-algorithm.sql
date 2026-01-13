-- 1. Create table flashcard_stats if it doesn't exist
CREATE TABLE IF NOT EXISTS flashcard_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES study_collection_flashcards(id) ON DELETE CASCADE,
  
  -- Progress tracking
  box integer DEFAULT 0,
  difficulty text,
  
  -- Timestamps
  last_reviewed_at timestamptz DEFAULT now(),
  next_review_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- SM-2 Algorithm columns
  ease_factor float DEFAULT 2.5,
  interval float DEFAULT 0,
  repetitions integer DEFAULT 0,

  -- Constraints
  UNIQUE(user_id, flashcard_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS flashcard_stats_user_id_idx ON flashcard_stats(user_id);
CREATE INDEX IF NOT EXISTS flashcard_stats_flashcard_id_idx ON flashcard_stats(flashcard_id);
CREATE INDEX IF NOT EXISTS flashcard_stats_next_review_idx ON flashcard_stats(next_review_at);

-- 3. Add columns if table already existed but without them (idempotency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcard_stats' AND column_name = 'ease_factor') THEN
        ALTER TABLE flashcard_stats ADD COLUMN ease_factor float DEFAULT 2.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcard_stats' AND column_name = 'interval') THEN
        ALTER TABLE flashcard_stats ADD COLUMN interval float DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcard_stats' AND column_name = 'repetitions') THEN
        ALTER TABLE flashcard_stats ADD COLUMN repetitions integer DEFAULT 0;
    END IF;
END $$;
