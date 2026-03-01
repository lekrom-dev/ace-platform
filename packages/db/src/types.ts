/**
 * Database types generated from Supabase schema
 */

// Branded types for IDs
export type ProspectId = string & { __brand: 'ProspectId' }
export type CustomerId = string & { __brand: 'CustomerId' }
export type ModuleId = string & { __brand: 'ModuleId' }
export type SubscriptionId = string & { __brand: 'SubscriptionId' }
export type InteractionId = string & { __brand: 'InteractionId' }
export type OpportunityId = string & { __brand: 'OpportunityId' }

// ENUM types
export type ProspectStatus =
  | 'new'
  | 'contacted'
  | 'engaged'
  | 'qualified'
  | 'converted'
  | 'lost'
  | 'nurture'

export type CustomerStatus = 'active' | 'churned' | 'paused' | 'suspended'

export type ModuleStatus = 'development' | 'active' | 'sunset' | 'retired'

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'suspended'

export type BillingCycle = 'monthly' | 'annual' | 'one_time'

export type InteractionChannel = 'email' | 'sms' | 'voice' | 'chat' | 'web' | 'system'

export type OpportunityStatus =
  | 'backlog'
  | 'concept'
  | 'validation'
  | 'greenlit'
  | 'building'
  | 'live'
  | 'sunset'

// Table types
export interface Prospect {
  id: ProspectId
  business_name: string
  website: string | null
  industry: string | null
  location_city: string | null
  location_state: string | null
  location_country: string
  size_estimate: string | null
  decision_maker_name: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  technology_stack: string[]
  pain_signals: string[]
  enrichment_data: Record<string, unknown>
  module_fit_scores: Record<string, number>
  overall_score: number
  status: ProspectStatus
  source: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: CustomerId
  auth_user_id: string | null
  name: string
  email: string
  company: string | null
  status: CustomerStatus
  lifetime_value: number
  health_score: number
  nps_score: number | null
  converted_from_prospect_id: ProspectId | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Module {
  id: ModuleId
  name: string
  description: string | null
  status: ModuleStatus
  pricing_config: Record<string, unknown>
  onboarding_config: Record<string, unknown>
  health_metrics: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: SubscriptionId
  customer_id: CustomerId
  module_id: ModuleId
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  plan: string
  billing_cycle: BillingCycle
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_reason: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: InteractionId
  entity_type: 'prospect' | 'customer'
  entity_id: string
  channel: InteractionChannel | null
  interaction_type: string
  content: string | null
  outcome: string | null
  sentiment_score: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Opportunity {
  id: OpportunityId
  title: string
  source_signals: unknown[]
  composite_score: number
  status: OpportunityStatus
  concept_brief: Record<string, unknown> | null
  validation_data: Record<string, unknown> | null
  decision_log: unknown[]
  created_at: string
  updated_at: string
}

// Insert types (without generated fields)
export type ProspectInsert = Omit<Prospect, 'id' | 'created_at' | 'updated_at'>
export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>
export type ModuleInsert = Omit<Module, 'created_at' | 'updated_at'>
export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
export type InteractionInsert = Omit<Interaction, 'id' | 'created_at'>
export type OpportunityInsert = Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>

// Update types (all fields optional except id)
export type ProspectUpdate = Partial<ProspectInsert>
export type CustomerUpdate = Partial<CustomerInsert>
export type ModuleUpdate = Partial<ModuleInsert>
export type SubscriptionUpdate = Partial<SubscriptionInsert>
export type InteractionUpdate = Partial<InteractionInsert>
export type OpportunityUpdate = Partial<OpportunityInsert>

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      prospects: {
        Row: Prospect
        Insert: ProspectInsert
        Update: ProspectUpdate
      }
      customers: {
        Row: Customer
        Insert: CustomerInsert
        Update: CustomerUpdate
      }
      modules: {
        Row: Module
        Insert: ModuleInsert
        Update: ModuleUpdate
      }
      subscriptions: {
        Row: Subscription
        Insert: SubscriptionInsert
        Update: SubscriptionUpdate
      }
      interactions: {
        Row: Interaction
        Insert: InteractionInsert
        Update: InteractionUpdate
      }
      opportunities: {
        Row: Opportunity
        Insert: OpportunityInsert
        Update: OpportunityUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      prospect_status: ProspectStatus
      customer_status: CustomerStatus
      module_status: ModuleStatus
      subscription_status: SubscriptionStatus
      billing_cycle: BillingCycle
      interaction_channel: InteractionChannel
      opportunity_status: OpportunityStatus
    }
  }
}
