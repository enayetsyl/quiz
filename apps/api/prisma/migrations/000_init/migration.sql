CREATE SCHEMA IF NOT EXISTS "quiz_gen";
SET search_path = "quiz_gen";

-- NCTB Quiz Generator - PostgreSQL schema (MVP)
-- Target: AWS RDS for PostgreSQL

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'approver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE question_status AS ENUM ('not_checked', 'approved', 'rejected', 'needs_fix');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE page_status AS ENUM ('pending', 'queued', 'generating', 'complete', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE option_key AS ENUM ('a', 'b', 'c', 'd');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- You may keep page/question language as a short code. For MVP, restrict to bn/en.
DO $$ BEGIN
  CREATE TYPE language_code AS ENUM ('bn', 'en');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Core taxonomy
CREATE TABLE IF NOT EXISTS class_levels (
  id SMALLINT PRIMARY KEY,                        -- 6..10
  display_name TEXT NOT NULL DEFAULT ''
);

-- Seed classes (id = 6..10)
INSERT INTO class_levels (id, display_name)
VALUES (6, 'Class 6'), (7, 'Class 7'), (8, 'Class 8'), (9, 'Class 9'), (10, 'Class 10')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id SMALLINT NOT NULL REFERENCES class_levels(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subject_per_class UNIQUE (class_id, name)
);

-- Subject short code for printable IDs (nullable; set later by admin)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_subject_code_format'
  ) THEN
    ALTER TABLE subjects
      ADD CONSTRAINT chk_subject_code_format
      CHECK (code IS NULL OR code ~ '^[A-Z]{2}$');
  END IF;
END $$;
-- Example (admin):
-- UPDATE subjects SET code = 'BN' WHERE name ILIKE 'Bangla';
-- UPDATE subjects SET code = 'EN' WHERE name ILIKE 'English';

CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ordinal INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chapter_ordinal_per_subject UNIQUE (subject_id, ordinal)
);

-- Users and auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,               -- store hash only
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin-configurable settings (singleton row is fine for MVP)
CREATE TABLE IF NOT EXISTS app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  rpm_cap INT NOT NULL DEFAULT 30 CHECK (rpm_cap > 0),
  worker_concurrency SMALLINT NOT NULL DEFAULT 5 CHECK (worker_concurrency > 0),
  queue_provider TEXT NOT NULL DEFAULT 'bullmq',
  rate_limit_safety_factor REAL NOT NULL DEFAULT 0.8 CHECK (rate_limit_safety_factor > 0 AND rate_limit_safety_factor < 1),
  token_estimate_initial INT NOT NULL DEFAULT 3000,
  api_bearer_token_hash TEXT,                    -- optional: static token hash
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alternatively, support multiple tokens (recommended if multiple consumers appear later)
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uploads and pages
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id SMALLINT NOT NULL REFERENCES class_levels(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  s3_bucket TEXT NOT NULL,
  s3_pdf_key TEXT NOT NULL,
  pages_count INT NOT NULL CHECK (pages_count >= 1),
  file_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploads_chapter ON uploads(chapter_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  page_number INT NOT NULL CHECK (page_number >= 1),
  language language_code,                         -- optional; set when known
  status page_status NOT NULL DEFAULT 'pending',
  s3_png_key TEXT NOT NULL,
  s3_thumb_key TEXT NOT NULL,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_page_per_upload UNIQUE (upload_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_pages_upload ON pages(upload_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

-- Questions (generated and edited)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  class_id SMALLINT NOT NULL REFERENCES class_levels(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
  language language_code NOT NULL,
  difficulty difficulty_level NOT NULL,
  stem TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option option_key NOT NULL,
  explanation TEXT NOT NULL,
  status question_status NOT NULL DEFAULT 'not_checked',
  line_index INT NOT NULL CHECK (line_index >= 0),
  is_locked_after_add BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_line_index_per_page UNIQUE (page_id, line_index)
);

-- Helpful indexes for common filters
CREATE INDEX IF NOT EXISTS idx_questions_page ON questions(page_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_taxonomy_status ON questions(class_id, subject_id, chapter_id, status);

-- Question bank (published copies)
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  class_id SMALLINT NOT NULL REFERENCES class_levels(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  language language_code NOT NULL,
  difficulty difficulty_level NOT NULL,
  stem TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option option_key NOT NULL,
  explanation TEXT NOT NULL,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qb_taxonomy ON question_bank(class_id, subject_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_qb_created_at ON question_bank(created_at);

-- Human-readable printable codes for published questions
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS seq_no INT;            -- per (class_id, subject_id)
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS subj_short_code TEXT;  -- e.g., BN00001

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_qb_seq_per_subject_class'
  ) THEN
    ALTER TABLE question_bank
      ADD CONSTRAINT uq_qb_seq_per_subject_class UNIQUE (class_id, subject_id, seq_no);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_qb_subj_short_code'
  ) THEN
    ALTER TABLE question_bank
      ADD CONSTRAINT uq_qb_subj_short_code UNIQUE (subj_short_code);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_qb_subj_short_code_format'
  ) THEN
    ALTER TABLE question_bank
      ADD CONSTRAINT chk_qb_subj_short_code_format
      CHECK (subj_short_code IS NULL OR subj_short_code ~ '^[A-Z]{2}[0-9]{5}$');
  END IF;
END $$;

-- Generation attempts / errors per page
CREATE TABLE IF NOT EXISTS page_generation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  attempt_no SMALLINT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  is_success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  request_excerpt TEXT,
  response_excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_attempt_per_page UNIQUE (page_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS idx_attempts_page ON page_generation_attempts(page_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON page_generation_attempts(created_at);

-- Optional: basic LLM usage tracking (tokens/cost)
CREATE TABLE IF NOT EXISTS llm_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES page_generation_attempts(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  tokens_in INT,
  tokens_out INT,
  estimated_cost_usd NUMERIC(10,5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-(class, subject) sequence counters for printable codes
CREATE TABLE IF NOT EXISTS subject_counters (
  class_id SMALLINT NOT NULL REFERENCES class_levels(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  next_val INT NOT NULL DEFAULT 1,
  PRIMARY KEY (class_id, subject_id)
);

-- Views for export convenience (match A#12 fields)
CREATE OR REPLACE VIEW v_export_questions AS
SELECT
  q.id                 AS question_id,
  cl.id               AS class,
  s.name              AS subject,
  c.name              AS chapter,
  p.page_number       AS page,
  q.language          AS language,
  q.difficulty        AS difficulty,
  q.stem              AS stem,
  q.option_a          AS option_a,
  q.option_b          AS option_b,
  q.option_c          AS option_c,
  q.option_d          AS option_d,
  q.correct_option    AS correct_option,
  q.explanation       AS explanation,
  q.status            AS status,
  q.created_at        AS created_at,
  -- Build a plain S3 URL; app should pre-sign at fetch time
  concat('s3://', u.s3_bucket, '/', p.s3_png_key) AS source_page_image_url
FROM questions q
JOIN pages p       ON p.id = q.page_id
JOIN uploads u     ON u.id = p.upload_id
JOIN class_levels cl ON cl.id = q.class_id
JOIN subjects s    ON s.id = q.subject_id
JOIN chapters c    ON c.id = q.chapter_id;

-- Export published Question Bank with printable codes
CREATE OR REPLACE VIEW v_export_question_bank AS
SELECT
  qb.id               AS question_bank_id,
  qb.subj_short_code  AS subj_short_code,
  qb.seq_no           AS seq_no,
  cl.id               AS class,
  s.name              AS subject,
  c.name              AS chapter,
  p.page_number       AS page,
  qb.language         AS language,
  qb.difficulty       AS difficulty,
  qb.stem             AS stem,
  qb.option_a         AS option_a,
  qb.option_b         AS option_b,
  qb.option_c         AS option_c,
  qb.option_d         AS option_d,
  qb.correct_option   AS correct_option,
  qb.explanation      AS explanation,
  qb.created_at       AS created_at,
  concat('s3://', u.s3_bucket, '/', p.s3_png_key) AS source_page_image_url
FROM question_bank qb
LEFT JOIN pages p       ON p.id = qb.page_id
LEFT JOIN uploads u     ON u.id = p.upload_id
JOIN class_levels cl    ON cl.id = qb.class_id
JOIN subjects s         ON s.id = qb.subject_id
JOIN chapters c         ON c.id = qb.chapter_id;

-- Guard: prevent edits to questions after publishing to Question Bank
-- Only allow flipping is_locked_after_add from false->true; block edits to core fields when locked.
CREATE OR REPLACE FUNCTION prevent_locked_question_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_locked_after_add AND OLD.is_locked_after_add AND (
       NEW.stem IS DISTINCT FROM OLD.stem OR
       NEW.option_a IS DISTINCT FROM OLD.option_a OR
       NEW.option_b IS DISTINCT FROM OLD.option_b OR
       NEW.option_c IS DISTINCT FROM OLD.option_c OR
       NEW.option_d IS DISTINCT FROM OLD.option_d OR
       NEW.correct_option IS DISTINCT FROM OLD.correct_option OR
       NEW.explanation IS DISTINCT FROM OLD.explanation
     ) THEN
    RAISE EXCEPTION 'Question is locked after being added to the Question Bank';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_questions_lock_guard
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_question_updates();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Updated_at triggers (utility)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_subjects_set_updated
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_chapters_set_updated
  BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_pages_set_updated
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_questions_set_updated
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Atomic allocator for per-(class,subject) printable sequence
CREATE OR REPLACE FUNCTION next_subject_seq(_class_id SMALLINT, _subject_id UUID)
RETURNS INT AS $$
DECLARE
  v_next INT;
BEGIN
  INSERT INTO subject_counters (class_id, subject_id, next_val)
  VALUES (_class_id, _subject_id, 2)
  ON CONFLICT (class_id, subject_id)
  DO UPDATE SET next_val = subject_counters.next_val + 1
  RETURNING next_val - 1 INTO v_next;  -- returns 1 on first insert, then 2,3,...
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- BEFORE INSERT hook to assign seq_no and subj_short_code
CREATE OR REPLACE FUNCTION qb_assign_short_code()
RETURNS TRIGGER AS $$
DECLARE
  v_code TEXT;
  v_seq INT;
BEGIN
  IF NEW.class_id IS NULL OR NEW.subject_id IS NULL THEN
    RAISE EXCEPTION 'question_bank requires class_id and subject_id to assign subj_short_code';
  END IF;

  SELECT code INTO v_code FROM subjects WHERE id = NEW.subject_id;
  IF v_code IS NULL OR v_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'Subject % has no 2-letter code; set subjects.code (^[A-Z]{2}$)', NEW.subject_id;
  END IF;

  v_seq := next_subject_seq(NEW.class_id, NEW.subject_id);
  NEW.seq_no := v_seq;
  NEW.subj_short_code := v_code || lpad(v_seq::text, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_qb_assign_short_code
  BEFORE INSERT ON question_bank
  FOR EACH ROW
  EXECUTE FUNCTION qb_assign_short_code();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Publish helper: copy question to Question Bank and lock source
CREATE OR REPLACE FUNCTION publish_question(_question_id UUID, _added_by UUID)
RETURNS UUID AS $$
DECLARE
  q questions%ROWTYPE;
  qb_id UUID;
BEGIN
  SELECT * INTO q FROM questions WHERE id = _question_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question % not found', _question_id;
  END IF;

  INSERT INTO question_bank (
    source_question_id, class_id, subject_id, chapter_id, page_id,
    language, difficulty, stem, option_a, option_b, option_c, option_d,
    correct_option, explanation, added_by
  ) VALUES (
    q.id, q.class_id, q.subject_id, q.chapter_id, q.page_id,
    q.language, q.difficulty, q.stem, q.option_a, q.option_b, q.option_c, q.option_d,
    q.correct_option, q.explanation, _added_by
  ) RETURNING id INTO qb_id;

  -- Lock the source question from further edits to core fields
  UPDATE questions SET is_locked_after_add = TRUE WHERE id = q.id;

  RETURN qb_id;
END;
$$ LANGUAGE plpgsql;
