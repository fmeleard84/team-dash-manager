-- Add cost_percentage columns to hr_languages and hr_expertises tables
ALTER TABLE public.hr_languages 
ADD COLUMN cost_percentage NUMERIC DEFAULT 5.0 NOT NULL;

ALTER TABLE public.hr_expertises 
ADD COLUMN cost_percentage NUMERIC DEFAULT 10.0 NOT NULL;

-- Update existing data with default percentages
UPDATE public.hr_languages SET cost_percentage = 5.0;
UPDATE public.hr_expertises SET cost_percentage = 10.0;