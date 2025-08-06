-- Add rating column to candidate_profiles
ALTER TABLE public.candidate_profiles 
ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00;

-- Create candidate_reviews table for client feedback
CREATE TABLE public.candidate_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_rating INTEGER NOT NULL CHECK (client_rating >= 1 AND client_rating <= 5),
  client_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, project_id)
);

-- Enable RLS on candidate_reviews
ALTER TABLE public.candidate_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for candidate_reviews
CREATE POLICY "Candidates can view their own reviews" 
ON public.candidate_reviews 
FOR SELECT 
USING (candidate_id IN (
  SELECT id FROM candidate_profiles 
  WHERE email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
));

CREATE POLICY "Admins can manage all reviews" 
ON public.candidate_reviews 
FOR ALL 
USING (true);

-- Add trigger for updated_at on candidate_reviews
CREATE TRIGGER update_candidate_reviews_updated_at
BEFORE UPDATE ON public.candidate_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update candidate rating based on reviews
CREATE OR REPLACE FUNCTION public.update_candidate_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.candidate_profiles 
  SET rating = (
    SELECT COALESCE(AVG(client_rating), 0.00)
    FROM public.candidate_reviews 
    WHERE candidate_id = COALESCE(NEW.candidate_id, OLD.candidate_id)
  )
  WHERE id = COALESCE(NEW.candidate_id, OLD.candidate_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to auto-update rating when reviews change
CREATE TRIGGER update_rating_on_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.candidate_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_candidate_rating();