/**
 * Retell AI Types
 * Based on Retell AI API documentation
 */

// ============================================================================
// WEBHOOK EVENT TYPES
// ============================================================================

export type RetellEventType = 'call_started' | 'call_ended' | 'call_analyzed'

export interface RetellWebhookEvent {
  event: RetellEventType
  call: RetellCall
}

export interface RetellCall {
  call_id: string
  agent_id: string
  call_type: 'inbound' | 'outbound' | 'web_call'
  call_status: 'registered' | 'ongoing' | 'ended' | 'error'

  // Participants
  from_number?: string
  to_number?: string

  // Timing
  start_timestamp?: number
  end_timestamp?: number
  duration_ms?: number

  // Transcript & Recording
  transcript?: string
  transcript_object?: TranscriptMessage[]
  recording_url?: string
  public_log_url?: string

  // Metadata
  metadata?: Record<string, any>
  retell_llm_dynamic_variables?: Record<string, any>

  // Analysis (for call_analyzed event)
  call_analysis?: CallAnalysis
}

export interface TranscriptMessage {
  role: 'agent' | 'user'
  content: string
  timestamp?: number
}

export interface CallAnalysis {
  call_summary?: string
  call_successful?: boolean
  in_voicemail?: boolean
  user_sentiment?: 'Negative' | 'Positive' | 'Neutral' | 'Unknown'
  custom_analysis_data?: Record<string, any>
}

// ============================================================================
// CUSTOM FUNCTION TYPES
// ============================================================================

export interface CustomFunctionCall {
  name: string
  arguments: Record<string, any>
}

export interface CustomFunctionResponse {
  result: string | Record<string, any>
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

export interface BookingCaptureArgs {
  customerName: string
  customerPhone: string
  serviceType: string
  preferredDate: string // ISO 8601 date
  preferredTime: string // HH:MM format
  description: string
  urgency: 'routine' | 'urgent' | 'emergency'
}

export interface CallbackRequestArgs {
  customerName: string
  customerPhone: string
  preferredCallbackTime: string // ISO 8601 datetime
  reason: string
}

export interface EmergencyTransferArgs {
  reason: string
  customerPhone: string
  urgency: 'high' | 'critical'
}

// ============================================================================
// RETELL API TYPES
// ============================================================================

export interface CreateAgentRequest {
  agent_name?: string
  llm_websocket_url: string
  voice_id: string
  voice_temperature?: number
  voice_speed?: number
  responsiveness?: number
  interruption_sensitivity?: number
  enable_backchannel?: boolean
  backchannel_frequency?: number
  backchannel_words?: string[]
  reminder_trigger_ms?: number
  reminder_max_count?: number
  ambient_sound?: string
  language?: string
  webhook_url?: string
  boosted_keywords?: string[]
}

export interface CreateAgentResponse {
  agent_id: string
  agent_name: string | null
  llm_websocket_url: string
  voice_id: string
  // ... other fields
}

export interface CreatePhoneNumberRequest {
  area_code?: number
  phone_number?: string
  inbound_agent_id?: string
  outbound_agent_id?: string
}

export interface CreatePhoneNumberResponse {
  phone_number_id: string
  phone_number: string
  inbound_agent_id?: string
  outbound_agent_id?: string
}

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

export interface WorkspaceConfig {
  workspace_id: string
  api_key: string
}
