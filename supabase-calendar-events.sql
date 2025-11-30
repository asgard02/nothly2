-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    type TEXT NOT NULL CHECK (type IN ('exam', 'study', 'deadline')),
    color TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar events"
    ON public.calendar_events
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar events"
    ON public.calendar_events
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
    ON public.calendar_events
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
    ON public.calendar_events
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate titles per user
ALTER TABLE public.calendar_events ADD CONSTRAINT unique_user_event_title UNIQUE (user_id, title);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS calendar_events_user_id_idx ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS calendar_events_date_idx ON public.calendar_events(date);
