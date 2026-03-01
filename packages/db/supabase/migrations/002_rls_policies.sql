-- ACE Platform Row Level Security Policies
-- Migration 002: Enable RLS and define access policies for all tables

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CUSTOMERS TABLE POLICIES
-- Users can only access their own customer record
-- ============================================================================

-- SELECT: Authenticated users can read their own record
CREATE POLICY "Users can read their own customer record"
    ON customers
    FOR SELECT
    TO authenticated
    USING (auth.uid() = auth_user_id);

-- UPDATE: Authenticated users can update their own record
CREATE POLICY "Users can update their own customer record"
    ON customers
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- INSERT: Service role only (engine creates customers programmatically)
CREATE POLICY "Service role can insert customers"
    ON customers
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- DELETE: Service role only
CREATE POLICY "Service role can delete customers"
    ON customers
    FOR DELETE
    TO service_role
    USING (true);

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- Users can see subscriptions linked to their customer record
-- ============================================================================

-- SELECT: Users can see their own subscriptions
CREATE POLICY "Users can read their own subscriptions"
    ON subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE: Service role only
CREATE POLICY "Service role can insert subscriptions"
    ON subscriptions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions"
    ON subscriptions
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can delete subscriptions"
    ON subscriptions
    FOR DELETE
    TO service_role
    USING (true);

-- ============================================================================
-- INTERACTIONS TABLE POLICIES
-- Users can see interactions linked to their customer record
-- ============================================================================

-- SELECT: Users can see interactions for their customer record
CREATE POLICY "Users can read their own interactions"
    ON interactions
    FOR SELECT
    TO authenticated
    USING (
        entity_type = 'customer' AND
        entity_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE: Service role only
CREATE POLICY "Service role can insert interactions"
    ON interactions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update interactions"
    ON interactions
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can delete interactions"
    ON interactions
    FOR DELETE
    TO service_role
    USING (true);

-- ============================================================================
-- MODULES TABLE POLICIES
-- Modules are public metadata - anyone can read
-- ============================================================================

-- SELECT: Anyone can read modules (public product information)
CREATE POLICY "Anyone can read modules"
    ON modules
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- INSERT/UPDATE/DELETE: Service role only
CREATE POLICY "Service role can manage modules"
    ON modules
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- PROSPECTS TABLE POLICIES
-- Internal engine data - service role only
-- ============================================================================

-- All operations: Service role only
CREATE POLICY "Service role has full access to prospects"
    ON prospects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- OPPORTUNITIES TABLE POLICIES
-- Internal Innovation Loop data - service role only
-- ============================================================================

-- All operations: Service role only
CREATE POLICY "Service role has full access to opportunities"
    ON opportunities
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can read their own customer record" ON customers IS
    'Authenticated users can only SELECT their own customer record via auth.uid()';

COMMENT ON POLICY "Users can read their own subscriptions" ON subscriptions IS
    'Users can view subscriptions where customer_id matches their customer record';

COMMENT ON POLICY "Users can read their own interactions" ON interactions IS
    'Users can view interactions linked to their customer record';

COMMENT ON POLICY "Anyone can read modules" ON modules IS
    'Modules are public product metadata visible to all users';

COMMENT ON POLICY "Service role has full access to prospects" ON prospects IS
    'Prospects are internal engine data, never exposed to end-users';

COMMENT ON POLICY "Service role has full access to opportunities" ON opportunities IS
    'Opportunities are internal Innovation Loop data for product development';
