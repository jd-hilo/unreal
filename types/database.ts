export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          first_name: string | null;
          hometown: string | null;
          family_relationship: 'supportive' | 'strained' | 'mixed' | 'unknown' | null;
          university: string | null;
          major: string | null;
          career_entrypoint: string | null;
          current_location: string | null;
          net_worth: string | null;
          political_views: string | null;
          twin_code: string | null;
          is_premium: boolean;
          ab_test_group: 'A' | 'B' | null;
          simulation_credits: number | null;
          core_json: CoreJsonData;
          values_json: string[];
          narrative_summary: string | null;
          narrative_embedding: number[] | null;
          life_situation: string | null;
          life_journey: string | null;
          core_value: string | null;
          dream_vision: DreamVision | null;
          dream_self_progress: Record<string, number>;
          current_health: any | null;
          relationship_details: any | null;
          est_days_remaining: number | string | null;
          current_streak: number;
          total_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          first_name?: string | null;
          hometown?: string | null;
          family_relationship?: 'supportive' | 'strained' | 'mixed' | 'unknown' | null;
          university?: string | null;
          major?: string | null;
          career_entrypoint?: string | null;
          current_location?: string | null;
          net_worth?: string | null;
          political_views?: string | null;
          twin_code?: string | null;
          is_premium?: boolean;
          ab_test_group?: 'A' | 'B' | null;
          simulation_credits?: number | null;
          core_json?: CoreJsonData;
          values_json?: string[];
          narrative_summary?: string | null;
          narrative_embedding?: number[] | null;
          life_situation?: string | null;
          life_journey?: string | null;
          core_value?: string | null;
          dream_vision?: DreamVision | null;
          dream_self_progress?: Record<string, number>;
          current_health?: any | null;
          relationship_details?: any | null;
          est_days_remaining?: number | string | null;
          current_streak?: number;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          first_name?: string | null;
          hometown?: string | null;
          family_relationship?: 'supportive' | 'strained' | 'mixed' | 'unknown' | null;
          university?: string | null;
          major?: string | null;
          career_entrypoint?: string | null;
          current_location?: string | null;
          net_worth?: string | null;
          political_views?: string | null;
          twin_code?: string | null;
          is_premium?: boolean;
          ab_test_group?: 'A' | 'B' | null;
          simulation_credits?: number | null;
          core_json?: CoreJsonData;
          values_json?: string[];
          narrative_summary?: string | null;
          narrative_embedding?: number[] | null;
          life_situation?: string | null;
          life_journey?: string | null;
          core_value?: string | null;
          dream_vision?: DreamVision | null;
          dream_self_progress?: Record<string, number>;
          current_health?: any | null;
          relationship_details?: any | null;
          est_days_remaining?: number | string | null;
          current_streak?: number;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          user_id_1: string;
          user_id_2: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id_1: string;
          user_id_2: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id_1?: string;
          user_id_2?: string;
          created_at?: string;
        };
      };
      relationships: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          relationship_type: string;
          years_known: number | null;
          contact_frequency: string | null;
          influence: number | null;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          relationship_type: string;
          years_known?: number | null;
          contact_frequency?: string | null;
          influence?: number | null;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          relationship_type?: string;
          years_known?: number | null;
          contact_frequency?: string | null;
          influence?: number | null;
          location?: string | null;
          created_at?: string;
        };
      };
      career_entries: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          company: string | null;
          start_date: string | null;
          end_date: string | null;
          satisfaction: number | null;
          notes: string | null;
          source: 'manual' | 'linkedin';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          company?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          satisfaction?: number | null;
          notes?: string | null;
          source?: 'manual' | 'linkedin';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          company?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          satisfaction?: number | null;
          notes?: string | null;
          source?: 'manual' | 'linkedin';
          created_at?: string;
        };
      };
      decisions: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          options: string[];
          context_summary: string | null;
          prediction: DecisionPrediction | null;
          status: 'draft' | 'pending' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question: string;
          options?: string[];
          context_summary?: string | null;
          prediction?: DecisionPrediction | null;
          status?: 'draft' | 'pending' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question?: string;
          options?: string[];
          context_summary?: string | null;
          prediction?: DecisionPrediction | null;
          status?: 'draft' | 'pending' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
      };
      simulations: {
        Row: {
          id: string;
          user_id: string;
          decision_id: string | null;
          scenarios: Record<string, SimulationScenario>;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          decision_id?: string | null;
          scenarios?: Record<string, SimulationScenario>;
          summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          decision_id?: string | null;
          scenarios?: Record<string, SimulationScenario>;
          summary?: string | null;
          created_at?: string;
        };
      };
      what_if: {
        Row: {
          id: string;
          user_id: string;
          counterfactual_type: string | null;
          payload: Record<string, any>;
          metrics: WhatIfMetrics;
          summary: string | null;
          biometrics?: WhatIfBiometrics | null;
          twin_alignment_score?: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          counterfactual_type?: string | null;
          payload?: Record<string, any>;
          metrics?: WhatIfMetrics;
          summary?: string | null;
          biometrics?: WhatIfBiometrics | null;
          twin_alignment_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          counterfactual_type?: string | null;
          payload?: Record<string, any>;
          metrics?: WhatIfMetrics;
          summary?: string | null;
          biometrics?: WhatIfBiometrics | null;
          twin_alignment_score?: number | null;
          created_at?: string;
        };
      };
      journals: {
        Row: {
          id: string;
          user_id: string;
          mood: number | null;
          text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mood?: number | null;
          text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mood?: number | null;
          text?: string | null;
          created_at?: string;
        };
      };
      career_simulations: {
        Row: {
          id: string;
          user_id: string;
          time_horizon: number;
          path_type: 'stay' | 'switch' | 'startup';
          role_title: string | null;
          company: string | null;
          salary: string | null;
          simulation_data: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          time_horizon: number;
          path_type: 'stay' | 'switch' | 'startup';
          role_title?: string | null;
          company?: string | null;
          salary?: string | null;
          simulation_data?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          time_horizon?: number;
          path_type?: 'stay' | 'switch' | 'startup';
          role_title?: string | null;
          company?: string | null;
          salary?: string | null;
          simulation_data?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      decision_participants: {
        Row: {
          id: string;
          decision_id: string;
          participant_user_id: string;
          added_by_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          decision_id: string;
          participant_user_id: string;
          added_by_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          decision_id?: string;
          participant_user_id?: string;
          added_by_user_id?: string;
          created_at?: string;
        };
      };
      interest_responses: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          option_a: string;
          option_b: string;
          option_a_image_url: string;
          option_b_image_url: string;
          option_a_description: string | null;
          option_b_description: string | null;
          selected_option: 'a' | 'b';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          option_a: string;
          option_b: string;
          option_a_image_url: string;
          option_b_image_url: string;
          option_a_description?: string | null;
          option_b_description?: string | null;
          selected_option: 'a' | 'b';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          option_a?: string;
          option_b?: string;
          option_a_image_url?: string;
          option_b_image_url?: string;
          option_a_description?: string | null;
          option_b_description?: string | null;
          selected_option?: 'a' | 'b';
          created_at?: string;
        };
      };
      interest_questions: {
        Row: {
          id: string;
          category: string;
          option_a: string;
          option_b: string;
          option_a_image_url: string;
          option_b_image_url: string;
          option_a_description: string | null;
          option_b_description: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          option_a: string;
          option_b: string;
          option_a_image_url: string;
          option_b_image_url: string;
          option_a_description?: string | null;
          option_b_description?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          option_a?: string;
          option_b?: string;
          option_a_image_url?: string;
          option_b_image_url?: string;
          option_a_description?: string | null;
          option_b_description?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      year_predictions: {
        Row: {
          id: string;
          user_id: string;
          scenario_type: 'estimated' | 'best_case' | 'worst_case';
          probability_percentage: number | null;
          prediction_data: YearPredictionData;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scenario_type: 'estimated' | 'best_case' | 'worst_case';
          probability_percentage?: number | null;
          prediction_data: YearPredictionData;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          scenario_type?: 'estimated' | 'best_case' | 'worst_case';
          probability_percentage?: number | null;
          prediction_data?: YearPredictionData;
          created_at?: string;
          updated_at?: string;
        };
      };
      timelines: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          current_age: number;
          current_year: number;
          stats: TimelineStats;
          events: TimelineEvent[];
          assets: TimelineAsset[];
          twin_profile: TimelineTwinProfile;
          scenario_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          current_age: number;
          current_year?: number;
          stats?: TimelineStats;
          events?: TimelineEvent[];
          assets?: TimelineAsset[];
          twin_profile?: TimelineTwinProfile;
          scenario_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          current_age?: number;
          current_year?: number;
          stats?: TimelineStats;
          events?: TimelineEvent[];
          assets?: TimelineAsset[];
          twin_profile?: TimelineTwinProfile;
          scenario_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export interface YearPredictionData {
  hero: {
    title: string;
    keyStat: string;
  };
  stats: {
    label: string;
    value: string;
    description: string;
  }[];
  timeline: {
    time: string;
    title: string;
    description: string;
  }[];
  highlights: {
    title: string;
    description: string;
    emoji: string;
  }[];
  insights: string[];
  focusAreas?: string[];
}

export interface DreamVision {
  net_worth_goal?: string;
  relationship_status_goal?: string;
  partner_details?: string;
  family_plans?: string;
  dream_home?: string;
  dream_city?: string;
  career_vision?: string;
  health_goals?: string;
  hobbies_interests?: string;
  travel_plans?: string;
}

export interface DailyTask {
  id: string;
  user_id: string;
  task_content: string;
  category: string | null;
  is_completed: boolean;
  scheduled_date: string;
  points: number;
  feedback_journal?: string;
  created_at: string;
  updated_at: string;
}

export interface ArchitectFeedback {
  id: string;
  user_id: string;
  date: string;
  feedback: string;
  completed_tasks_count: number;
  created_at: string;
}

export interface CoreJsonData {
  age_range?: string;
  city?: string;
  country?: string;
  primary_role?: string;
  job_sentiment?: string;
  employment_type?: string;
  side_projects?: string;
  motivation?: string;
  [key: string]: any;
}

export interface DecisionPrediction {
  prediction: string;
  probs: Record<string, number>;
  rationale: string;
  factors: string[];
  uncertainty: number;
  chaosLevel?: number;
  chaosMessage?: string;
  sideEffects?: string[];
  nextSteps?: string[];
}

export interface SimulationScenario {
  deltas: {
    happiness: number;
    money: number;
    relationship: number;
    freedom: number;
    growth: number;
  };
  risk_notes: string[];
  notes: string;
}

export interface TimelineEvent {
  time: string;
  title: string;
  description: string;
  people?: string[]; // Array of first names involved in this event
}

export interface TimelineSimulation {
  one_year: TimelineEvent[];
  three_year: TimelineEvent[];
  five_year: TimelineEvent[];
  ten_year: TimelineEvent[];
}

export interface WhatIfMetrics {
  happiness?: { current: number; alternate: number };
  money?: { current: number; alternate: number };
  relationship?: { current: number; alternate: number };
  freedom?: { current: number; alternate: number };
  growth?: { current: number; alternate: number };
}

export interface WhatIfBiometrics {
  weight?: { current: string; alternate: string; change: string };
  relationshipStatus?: { current: string; alternate: string };
  netWorth?: { current: string; alternate: string; percentChange: string };
  location?: { current: string; alternate: string };
  hobby?: { current: string; alternate: string };
  mood?: { current: string; alternate: string };
}

export interface RelationshipExtraction {
  duration: any;
  name: string;
  relationship_type: string;
  years_known?: number;
  contact_frequency?: string;
  influence: number;
  location?: string;
  sentiment?: string;
}

export interface CareerExtraction {
  title: string;
  company?: string;
  start_date?: string;
  end_date?: string;
  satisfaction?: number;
}

export interface LifeExtractionResult {
  core_json: CoreJsonData;
  values_json: string[];
  relationships: RelationshipExtraction[];
  career_snippets: CareerExtraction[];
  needs: string[];
  summary: string;
}

export interface ClarifierQuestion {
  id: string;
  type: 'picker-month-year' | 'slider-years' | 'city-autocomplete' | 'text' | 'chips';
  label: string;
  options?: string[];
}

export interface InterestResponse {
  id: string;
  user_id: string;
  category: string;
  option_a: string;
  option_b: string;
  option_a_image_url: string;
  option_b_image_url: string;
  option_a_description: string | null;
  option_b_description: string | null;
  selected_option: 'a' | 'b';
  created_at: string;
}

export interface TimelineStats {
  money: number;
  happiness: number;
  freedom: number;
  growth: number;
  relationships: number;
}

export interface TimelineAsset {
  name: string;
  type: 'car' | 'apartment' | 'house' | 'pet' | 'other';
  value?: string;
  acquired_at: string;
  description?: string;
}

export interface TimelineTwinProfile {
  relationshipStatus?: string;
  job?: string;
  location?: string;
  netWorth?: string;
  [key: string]: any;
}
