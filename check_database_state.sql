-- Check Database State
-- Run this in Supabase SQL Editor to see what's already applied
-- =====================================================

-- Check if main tables exist
SELECT
    'Table Check' as check_type,
    table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = t.table_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES
    ('customers'),
    ('prospects'),
    ('tradie_configs'),
    ('call_logs'),
    ('call_actions'),
    ('referrals'),
    ('referral_invitations'),
    ('subscriptions')
) AS t(table_name)

UNION ALL

-- Check if important columns exist
SELECT
    'Column Check' as check_type,
    column_info as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = split_part(column_info, '.', 1)
        AND column_name = split_part(column_info, '.', 2)
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES
    ('customers.stripe_customer_id'),
    ('customers.signup_discount_percentage'),
    ('customers.referral_code'),
    ('customers.referral_discount_percentage'),
    ('tradie_configs.emergency_number'),
    ('tradie_configs.retell_workspace_id'),
    ('subscriptions.stripe_subscription_id')
) AS t(column_info)

UNION ALL

-- Check if important functions exist
SELECT
    'Function Check' as check_type,
    routine_name as table_name,
    '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'generate_referral_code',
    'calculate_referral_discount',
    'update_referral_stats',
    'activate_referral',
    'churn_referral',
    'get_pending_referral_invitations',
    'get_customer_by_stripe_id',
    'get_active_subscription'
)

ORDER BY check_type, table_name;
