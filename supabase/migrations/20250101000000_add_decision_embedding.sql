-- Add decision_embedding column for vector similarity search
ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS decision_embedding vector(1536);

-- Add index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_decisions_decision_embedding 
ON decisions USING ivfflat (decision_embedding vector_cosine_ops)
WITH (lists = 100)
WHERE decision_embedding IS NOT NULL;

-- Add column to track if user opts in to public insights
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS contribute_to_insights boolean DEFAULT true;






