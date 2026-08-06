-- Migration: Create predictions table and RLS policies for AI Academic Early Warning System

CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matric_no TEXT NOT NULL REFERENCES public.students(matric_no) ON DELETE CASCADE,
    current_cgpa NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    predicted_gpa NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    predicted_cgpa NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low Risk', 'Medium Risk', 'High Risk', 'LOW', 'MEDIUM', 'HIGH')),
    risk_probability NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    trend_direction TEXT NOT NULL CHECK (trend_direction IN ('Improving', 'Stable', 'Declining')),
    trend_slope NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    failed_courses_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_predictions_matric_no ON public.predictions(matric_no);
CREATE INDEX IF NOT EXISTS idx_predictions_risk_level ON public.predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions(created_at DESC);

-- Enable RLS
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can view own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Admins and counselors can insert predictions" ON public.predictions;
DROP POLICY IF EXISTS "Admins and counselors can update predictions" ON public.predictions;

-- Policies for public.predictions using direct role check subqueries
-- 1. Select Policy: Students view own, Admins & Counselors view all
CREATE POLICY "Students can view own predictions"
    ON public.predictions
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT p.id FROM public.profiles p WHERE p.matric_no = predictions.matric_no
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'counselor')
        )
    );

-- 2. Insert Policy: Admins, Counselors, or authenticated app workflows
CREATE POLICY "Admins and counselors can insert predictions"
    ON public.predictions
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'counselor')
        )
    );

-- 3. Update Policy: Admins & Counselors
CREATE POLICY "Admins and counselors can update predictions"
    ON public.predictions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'counselor')
        )
    );

-- Trigger Function for High Risk auto-referral
CREATE OR REPLACE FUNCTION public.handle_high_risk_prediction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_counselor_id INT;
    v_existing_pending INT;
BEGIN
    IF NEW.risk_level IN ('High Risk', 'HIGH') THEN
        SELECT COUNT(*) INTO v_existing_pending
        FROM public.counselor_referrals
        WHERE matric_no = NEW.matric_no AND status = 'PENDING';

        IF v_existing_pending = 0 THEN
            SELECT id INTO v_counselor_id
            FROM public.counselors
            ORDER BY id ASC
            LIMIT 1;

            INSERT INTO public.counselor_referrals (
                matric_no,
                counselor_id,
                referral_reason,
                cgpa_at_referral,
                status,
                meeting_deadline,
                referred_at
            ) VALUES (
                NEW.matric_no,
                v_counselor_id,
                'BELOW AVERAGE',
                NEW.current_cgpa,
                'PENDING',
                (now() + INTERVAL '7 days')::date::text,
                now()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_high_risk_prediction ON public.predictions;
CREATE TRIGGER trg_high_risk_prediction
    AFTER INSERT OR UPDATE ON public.predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_high_risk_prediction();
