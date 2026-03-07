/**
 * Retell AI Client
 * Wrapper around official Retell SDK with per-workspace authentication
 */

import Retell from 'retell-sdk'
import type { WorkspaceConfig } from './types'

export class RetellClient {
  private client: Retell
  private workspaceId?: string

  constructor(config: WorkspaceConfig | { apiKey: string }) {
    if ('workspace_id' in config) {
      this.workspaceId = config.workspace_id
      this.client = new Retell({
        apiKey: config.api_key,
      })
    } else {
      this.client = new Retell({
        apiKey: config.apiKey,
      })
    }
  }

  // ============================================================================
  // AGENT MANAGEMENT
  // ============================================================================

  async createAgent(data: any) {
    return this.client.agent.create(data)
  }

  async getAgent(agentId: string) {
    return this.client.agent.retrieve(agentId)
  }

  async updateAgent(agentId: string, data: any) {
    return this.client.agent.update(agentId, data)
  }

  async deleteAgent(agentId: string) {
    return this.client.agent.delete(agentId)
  }

  async listAgents() {
    return this.client.agent.list()
  }

  // ============================================================================
  // PHONE NUMBER MANAGEMENT
  // ============================================================================

  async createPhoneNumber(data: any) {
    return this.client.phoneNumber.create(data)
  }

  async getPhoneNumber(phoneNumberId: string) {
    return this.client.phoneNumber.retrieve(phoneNumberId)
  }

  async updatePhoneNumber(phoneNumberId: string, data: any) {
    return this.client.phoneNumber.update(phoneNumberId, data)
  }

  async deletePhoneNumber(phoneNumberId: string) {
    return this.client.phoneNumber.delete(phoneNumberId)
  }

  async listPhoneNumbers() {
    return this.client.phoneNumber.list()
  }

  // ============================================================================
  // CALL MANAGEMENT
  // ============================================================================

  async getCall(callId: string) {
    return this.client.call.retrieve(callId)
  }

  async listCalls(params?: any) {
    return this.client.call.list(params)
  }

  // ============================================================================
  // LLM MANAGEMENT
  // ============================================================================

  async createLlm(data: any) {
    return this.client.llm.create(data)
  }

  async getLlm(llmId: string) {
    return this.client.llm.retrieve(llmId)
  }

  async updateLlm(llmId: string, data: any) {
    return this.client.llm.update(llmId, data)
  }

  async deleteLlm(llmId: string) {
    return this.client.llm.delete(llmId)
  }

  async listLlms() {
    return this.client.llm.list()
  }
}

/**
 * Create a Retell client for a specific workspace
 */
export function createRetellClient(config: WorkspaceConfig): RetellClient {
  return new RetellClient(config)
}

/**
 * Create a Retell client using the platform master API key
 * Only use this for workspace creation and management
 */
export function createMasterRetellClient(): RetellClient {
  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) {
    throw new Error('RETELL_API_KEY environment variable is not set')
  }
  return new RetellClient({ apiKey })
}
