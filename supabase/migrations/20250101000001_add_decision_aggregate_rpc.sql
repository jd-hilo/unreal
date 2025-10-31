-- RPC function to get decision aggregate statistics
CREATE OR REPLACE FUNCTION get_decision_aggregate(
  p_decision_id uuid,
  p_user_id uuid,
  p_embedding vector(1536)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_similar_decisions jsonb;
  v_groups jsonb := '{}'::jsonb;
  v_global_probs jsonb := '{}'::jsonb;
  v_global_count int := 0;
  v_consensus_score numeric;
  v_result jsonb;
  rec RECORD;
BEGIN
  -- Find similar decisions using vector similarity
  -- Exclude the current decision and user's own decisions
  -- Only include decisions from users who opted in (contribute_to_insights = true)
  WITH similar_decisions AS (
    SELECT 
      d.id,
      d.user_id,
      d.question,
      d.options,
      d.prediction,
      d.decision_embedding <=> p_embedding AS distance,
      p.core_json->>'age_range' AS age_range,
      p.core_json->>'primary_role' AS role,
      p.core_json->>'city' AS city,
      p.contribute_to_insights
    FROM decisions d
    JOIN profiles p ON p.user_id = d.user_id
    WHERE d.id != p_decision_id
      AND d.user_id != p_user_id
      AND d.prediction IS NOT NULL
      AND d.decision_embedding IS NOT NULL
      AND (p.contribute_to_insights IS NULL OR p.contribute_to_insights = true)
    ORDER BY d.decision_embedding <=> p_embedding
    LIMIT 200
  ),
  -- Aggregate global probabilities
  global_agg AS (
    SELECT 
      jsonb_object_agg(
        option_key,
        AVG(option_prob::numeric)
      ) AS probs,
      COUNT(DISTINCT similar_decisions.id) AS sample_size
    FROM similar_decisions,
    LATERAL jsonb_each_text(similar_decisions.prediction->'probs') AS opt(option_key, option_prob)
  ),
  -- Aggregate by age band
  age_agg AS (
    SELECT 
      CASE 
        WHEN age_range ~ '^\d+-\d+$' THEN
          CASE 
            WHEN (SPLIT_PART(age_range, '-', 1)::int) < 22 THEN 'age_18_21'
            WHEN (SPLIT_PART(age_range, '-', 1)::int) < 27 THEN 'age_22_26'
            WHEN (SPLIT_PART(age_range, '-', 1)::int) < 32 THEN 'age_27_31'
            WHEN (SPLIT_PART(age_range, '-', 1)::int) < 37 THEN 'age_32_36'
            WHEN (SPLIT_PART(age_range, '-', 1)::int) < 42 THEN 'age_37_41'
            ELSE 'age_42_plus'
          END
        ELSE NULL
      END AS age_band,
      jsonb_object_agg(
        option_key,
        AVG(option_prob::numeric)
      ) AS probs,
      COUNT(DISTINCT similar_decisions.id) AS sample_size
    FROM similar_decisions,
    LATERAL jsonb_each_text(similar_decisions.prediction->'probs') AS opt(option_key, option_prob)
    WHERE age_range IS NOT NULL
    GROUP BY age_band
    HAVING COUNT(DISTINCT similar_decisions.id) >= 10
  ),
  -- Aggregate by role (simple keyword matching)
  role_agg AS (
    SELECT 
      CASE 
        WHEN role ILIKE '%engineer%' OR role ILIKE '%developer%' THEN 'engineer_roles'
        WHEN role ILIKE '%sales%' THEN 'sales_roles'
        WHEN role ILIKE '%manager%' OR role ILIKE '%director%' THEN 'management_roles'
        WHEN role ILIKE '%designer%' THEN 'design_roles'
        ELSE NULL
      END AS role_tag,
      jsonb_object_agg(
        option_key,
        AVG(option_prob::numeric)
      ) AS probs,
      COUNT(DISTINCT similar_decisions.id) AS sample_size
    FROM similar_decisions,
    LATERAL jsonb_each_text(similar_decisions.prediction->'probs') AS opt(option_key, option_prob)
    WHERE role IS NOT NULL
    GROUP BY role_tag
    HAVING COUNT(DISTINCT similar_decisions.id) >= 10
  ),
  -- Aggregate by city/region
  city_agg AS (
    SELECT 
      city AS city_tag,
      jsonb_object_agg(
        option_key,
        AVG(option_prob::numeric)
      ) AS probs,
      COUNT(DISTINCT similar_decisions.id) AS sample_size
    FROM similar_decisions,
    LATERAL jsonb_each_text(similar_decisions.prediction->'probs') AS opt(option_key, option_prob)
    WHERE city IS NOT NULL
    GROUP BY city
    HAVING COUNT(DISTINCT similar_decisions.id) >= 10
  )
  SELECT 
    global_agg.probs,
    global_agg.sample_size
  INTO v_global_probs, v_global_count
  FROM global_agg;

  -- Build groups object
  IF v_global_count >= 10 THEN
    v_groups := jsonb_set(v_groups, '{global}', 
      jsonb_build_object('probs', v_global_probs, 'sample_size', v_global_count)
    );
  END IF;

  -- Add age bands
  FOR rec IN 
    SELECT age_band, probs, sample_size FROM age_agg
  LOOP
    v_groups := jsonb_set(v_groups, ARRAY[rec.age_band], 
      jsonb_build_object('probs', rec.probs, 'sample_size', rec.sample_size)
    );
  END LOOP;

  -- Add role tags
  FOR rec IN 
    SELECT role_tag, probs, sample_size FROM role_agg
  LOOP
    v_groups := jsonb_set(v_groups, ARRAY[rec.role_tag], 
      jsonb_build_object('probs', rec.probs, 'sample_size', rec.sample_size)
    );
  END LOOP;

  -- Add cities
  FOR rec IN 
    SELECT city_tag, probs, sample_size FROM city_agg
  LOOP
    v_groups := jsonb_set(v_groups, ARRAY[LOWER(rec.city_tag)], 
      jsonb_build_object('probs', rec.probs, 'sample_size', rec.sample_size)
    );
  END LOOP;

  -- Calculate consensus score (agreement with top choice)
  IF v_global_probs IS NOT NULL AND jsonb_object_keys(v_global_probs) IS NOT NULL THEN
    SELECT MAX(value::numeric) INTO v_consensus_score
    FROM jsonb_each(v_global_probs);
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'sample_size', v_global_count,
    'groups', v_groups,
    'consensus_score', COALESCE(v_consensus_score, 0)
  );

  RETURN v_result;
END;
$$;

