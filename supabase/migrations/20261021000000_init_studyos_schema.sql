-- StudyOS Initial Relational Schema & Row Level Security (RLS) Policies
-- Planning Timezone: Asia/Kolkata
-- Planning Window: 21 October 2026 - 31 January 2027

-- 1. Profiles Table (1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    target_exam_date DATE NOT NULL DEFAULT '2027-02-06',
    target_score INTEGER NOT NULL DEFAULT 80,
    historical_baseline_score INTEGER DEFAULT 21,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. Calendar Events & Hard Locks
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'exam_lock', 'college_term', 'holiday', 'presentation', 'practical'
    title TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    lock_level TEXT NOT NULL DEFAULT 'hard', -- 'hard', 'soft'
    allowed_task_types TEXT[] DEFAULT '{}',
    banned_task_types TEXT[] DEFAULT '{}',
    gate_capacity_minutes INTEGER NOT NULL DEFAULT 0,
    is_tentative BOOLEAN NOT NULL DEFAULT false,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar events"
    ON public.calendar_events FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_calendar_events_user_dates ON public.calendar_events(user_id, start_date, end_date);

-- 3. Day Capacity Overrides
CREATE TABLE IF NOT EXISTS public.day_capacity_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    minutes INTEGER NOT NULL CHECK (minutes >= 0 AND minutes <= 1440),
    reason TEXT NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_day_override UNIQUE (user_id, local_date)
);

ALTER TABLE public.day_capacity_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own capacity overrides"
    ON public.day_capacity_overrides FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    category TEXT NOT NULL, -- 'gate_core', 'gate_general', 'ese_only'
    baseline TEXT NOT NULL DEFAULT 'neutral', -- 'weak', 'neutral', 'prior_knowledge'
    weight_ese INTEGER DEFAULT 1,
    syllabus_version TEXT NOT NULL DEFAULT 'GATE_DA_2027',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_subject_code UNIQUE (user_id, code)
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subjects"
    ON public.subjects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Syllabus Topics
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    official_ref TEXT,
    prerequisites UUID[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'lectures_done', 'practicing', 'mastered'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own syllabus topics"
    ON public.syllabus_topics FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_topics_subject ON public.syllabus_topics(user_id, subject_id);

-- 6. Playlists / Course Variants
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    source_url TEXT,
    is_crash_course BOOLEAN NOT NULL DEFAULT false,
    source_runtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
    effective_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.5 CHECK (effective_multiplier >= 1.0),
    selected BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own playlists"
    ON public.playlists FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Lectures
CREATE TABLE IF NOT EXISTS public.lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    ordinal INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    runtime_seconds INTEGER,
    effective_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.5,
    skip_status TEXT NOT NULL DEFAULT 'not_skipped', -- 'not_skipped', 'skipped_assessed', 'skipped_unassessed'
    is_completed BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lectures"
    ON public.lectures FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 8. Study Tasks
CREATE TABLE IF NOT EXISTS public.study_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'video', 'notes', 'embedded_problems', 'independent_pyq', 'mock', 'analysis', 'ese', 'revision'
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes >= 0),
    completed_minutes INTEGER NOT NULL DEFAULT 0 CHECK (completed_minutes >= 0),
    due_local_date DATE,
    status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'doing', 'done', 'deferred', 'canceled'
    pinned BOOLEAN NOT NULL DEFAULT false,
    locked_to_date DATE,
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    why TEXT,
    prerequisites UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own study tasks"
    ON public.study_tasks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_status ON public.study_tasks(user_id, status);

-- 9. Schedule Assignments
CREATE TABLE IF NOT EXISTS public.schedule_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.study_tasks(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    planned_minutes INTEGER NOT NULL CHECK (planned_minutes > 0),
    plan_version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo',
    why TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_assignment_slot UNIQUE (user_id, task_id, local_date, plan_version)
);

ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedule assignments"
    ON public.schedule_assignments FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_assignments_user_date ON public.schedule_assignments(user_id, local_date);

-- 10. Study Sessions (Timer & Log)
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.study_tasks(id) ON DELETE SET NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    paused_seconds INTEGER NOT NULL DEFAULT 0,
    actual_seconds INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL DEFAULT 'timer', -- 'timer', 'manual'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own study sessions"
    ON public.study_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Enforce at most one active session per user (Singleton active timer constraint)
CREATE UNIQUE INDEX idx_user_single_active_session ON public.study_sessions(user_id) WHERE is_active = true;

-- 11. Question Items & Attempts
CREATE TABLE IF NOT EXISTS public.question_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stable_question_id TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    year INTEGER,
    marks NUMERIC(3, 1),
    question_ref TEXT NOT NULL,
    is_embedded_in_lecture BOOLEAN NOT NULL DEFAULT false,
    lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_stable_question UNIQUE (user_id, stable_question_id)
);

ALTER TABLE public.question_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own question items"
    ON public.question_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.question_items(id) ON DELETE CASCADE,
    result TEXT NOT NULL, -- 'correct', 'incorrect', 'skipped'
    confidence TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    notes TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own question attempts"
    ON public.question_attempts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 12. Mock Tests
CREATE TABLE IF NOT EXISTS public.mock_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_number INTEGER NOT NULL,
    is_historical_baseline BOOLEAN NOT NULL DEFAULT false, -- True for 2026 DA 21/100 score
    test_date DATE NOT NULL,
    paper_source TEXT NOT NULL,
    raw_score NUMERIC(5, 2) NOT NULL CHECK (raw_score >= -33.33 AND raw_score <= 100.00),
    max_marks NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    section_breakdown JSONB DEFAULT '{}'::jsonb,
    time_spent_minutes INTEGER NOT NULL DEFAULT 180,
    analysis_completed BOOLEAN NOT NULL DEFAULT false,
    analysis_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_mock_test_number UNIQUE (user_id, test_number, is_historical_baseline)
);

ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own mock tests"
    ON public.mock_tests FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 13. Error Notebook & Spaced Revision
CREATE TABLE IF NOT EXISTS public.error_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    error_category TEXT NOT NULL, -- 'conceptual', 'calculation', 'misread', 'time', 'guess'
    correction_notes TEXT NOT NULL,
    revisit_interval_days INTEGER NOT NULL DEFAULT 1, -- 1, 3, 7, 14, 30
    next_review_date DATE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'mastered'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.error_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own error items"
    ON public.error_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_errors_review_date ON public.error_items(user_id, next_review_date);

-- 14. Attendance Records
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    is_working_day BOOLEAN NOT NULL DEFAULT true,
    planned_attendance BOOLEAN NOT NULL DEFAULT false,
    actual_attendance BOOLEAN, -- NULL until recorded
    is_public_holiday BOOLEAN NOT NULL DEFAULT false,
    commute_minutes INTEGER NOT NULL DEFAULT 240, -- 4h roundtrip commute
    focused_study_capacity_minutes INTEGER NOT NULL DEFAULT 105,
    user_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_attendance_date UNIQUE (user_id, local_date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attendance records"
    ON public.attendance_records FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 15. Plan Versions & Snapshots (Reversibility and Undo)
CREATE TABLE IF NOT EXISTS public.plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_version INTEGER NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    assignments_snapshot JSONB NOT NULL,
    unscheduled_snapshot JSONB NOT NULL,
    feasibility_snapshot JSONB NOT NULL,
    inputs_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_user_plan_version UNIQUE (user_id, plan_version)
);

ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own plan versions"
    ON public.plan_versions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 16. AI Requests & Audit (Zero secrets logged, metadata only)
CREATE TABLE IF NOT EXISTS public.ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI request logs"
    ON public.ai_requests FOR SELECT
    USING (auth.uid() = user_id);
