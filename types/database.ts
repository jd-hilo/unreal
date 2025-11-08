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
          core_json: CoreJsonData;
          values_json: string[];
          narrative_summary: string | null;
          narrative_embedding: number[] | null;
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
          core_json?: CoreJsonData;
          values_json?: string[];
          narrative_summary?: string | null;
          narrative_embedding?: number[] | null;
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
          core_json?: CoreJsonData;
          values_json?: string[];
          narrative_summary?: string | null;
          narrative_embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          counterfactual_type?: string | null;
          payload?: Record<string, any>;
          metrics?: WhatIfMetrics;
          summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          counterfactual_type?: string | null;
          payload?: Record<string, any>;
          metrics?: WhatIfMetrics;
          summary?: string | null;
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
    };
  };
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
