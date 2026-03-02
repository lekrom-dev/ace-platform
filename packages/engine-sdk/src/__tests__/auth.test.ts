/**
 * Auth Module Tests
 * Verifies auth service exports all expected methods
 */

import { describe, it, expect } from 'vitest'
import { auth } from '../auth'

describe('Auth Module', () => {
  it('should export all required methods', () => {
    expect(auth).toBeDefined()
    expect(typeof auth.verifyUser).toBe('function')
    expect(typeof auth.createUser).toBe('function')
    expect(typeof auth.getCustomer).toBe('function')
  })

  it('should have correct method signatures', () => {
    // Verify methods exist and are callable
    expect(auth.verifyUser).toHaveLength(1) // Takes 1 parameter: token
    expect(auth.createUser).toHaveLength(3) // Takes 3 parameters: email, password, metadata
    expect(auth.getCustomer).toHaveLength(1) // Takes 1 parameter: authUserId
  })
})
