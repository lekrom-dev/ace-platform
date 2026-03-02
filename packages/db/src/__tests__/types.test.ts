/**
 * Type Definitions Test
 * Type-level test to verify key interfaces exist and compile correctly
 */

import { describe, it, expect } from 'vitest'
import type {
  Database,
  Prospect,
  Customer,
  Module,
  Subscription,
  Interaction,
  Opportunity,
  ProspectStatus,
  CustomerStatus,
} from '../types'

describe('Database Types', () => {
  it('should have Database interface with public schema', () => {
    // Type-level test - if this compiles, the types exist
    const mockDb: Partial<Database> = {
      public: {
        Tables: {
          prospects: {} as any,
          customers: {} as any,
          modules: {} as any,
          subscriptions: {} as any,
          interactions: {} as any,
          opportunities: {} as any,
        },
        Views: {},
        Functions: {},
        Enums: {
          prospect_status: 'new' as ProspectStatus,
          customer_status: 'active' as CustomerStatus,
          module_status: 'active',
          subscription_status: 'active',
          billing_cycle: 'monthly',
          interaction_channel: 'email',
          opportunity_status: 'backlog',
        },
      },
    }

    expect(mockDb).toBeDefined()
  })

  it('should have all main table types', () => {
    // Verify types can be instantiated
    const prospect: Partial<Prospect> = { business_name: 'Test' }
    const customer: Partial<Customer> = { email: 'test@example.com' }
    const module: Partial<Module> = { name: 'Test Module' }
    const subscription: Partial<Subscription> = { plan: 'starter' }
    const interaction: Partial<Interaction> = { interaction_type: 'email_sent' }
    const opportunity: Partial<Opportunity> = { title: 'Test Opportunity' }

    expect(prospect).toBeDefined()
    expect(customer).toBeDefined()
    expect(module).toBeDefined()
    expect(subscription).toBeDefined()
    expect(interaction).toBeDefined()
    expect(opportunity).toBeDefined()
  })

  it('should have branded ID types', () => {
    // Test that branded types exist (compile-time check)
    type ProspectIdTest = import('../types').ProspectId
    type CustomerIdTest = import('../types').CustomerId

    const prospectId: ProspectIdTest = 'test-id' as ProspectIdTest
    const customerId: CustomerIdTest = 'test-id' as CustomerIdTest

    expect(typeof prospectId).toBe('string')
    expect(typeof customerId).toBe('string')
  })
})
