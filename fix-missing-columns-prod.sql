
-- Migration pour aligner PROD sur DEV
-- Date: 2025-09-17T10:17:10.557Z

-- 1. Ajouter calculated_price à hr_resource_assignments
ALTER TABLE public.hr_resource_assignments
ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10,2);

-- 2. Ajouter skills à hr_profiles
ALTER TABLE public.hr_profiles
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- 3. Mettre à jour les valeurs si nécessaire
UPDATE public.hr_profiles
SET skills = ARRAY['JavaScript', 'React', 'Node.js']
WHERE name = 'Développeur Full-Stack' AND skills = '{}';

-- Ajouter d'autres mises à jour selon les besoins...
