-- Add rate columns to hr_resource_assignments for project-specific rates
ALTER TABLE hr_resource_assignments
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rate_per_minute DECIMAL(10,2);

-- Add comment to explain usage
COMMENT ON COLUMN hr_resource_assignments.daily_rate IS 'Daily rate for this specific assignment (overrides calculated rate)';
COMMENT ON COLUMN hr_resource_assignments.hourly_rate IS 'Hourly rate for this specific assignment (overrides calculated rate)';
COMMENT ON COLUMN hr_resource_assignments.rate_per_minute IS 'Rate per minute for this specific assignment (overrides calculated rate)';

-- Example: Update a specific assignment to use 2.33€/min
-- UPDATE hr_resource_assignments 
-- SET rate_per_minute = 2.33
-- WHERE candidate_id = '7f24d9c5-54eb-4185-815b-79daf6cdf4da' 
-- AND project_id = '990ae792-b015-4c6a-8fb6-7495f172bd61';