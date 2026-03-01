/**
 * Database seed script
 * Populates the database with test data for development
 */

import { createServiceClient } from './client'

async function seed() {
  const supabase = createServiceClient()

  console.log('🌱 Seeding database...')

  // ============================================================================
  // SEED PROSPECTS
  // ============================================================================
  console.log('Creating test prospects...')

  const prospects = await supabase
    .from('prospects')
    .insert([
      {
        business_name: "John's Plumbing",
        website: 'https://johnsplumbing.com.au',
        industry: 'Plumbing',
        location_city: 'Sydney',
        location_state: 'NSW',
        location_country: 'AU',
        size_estimate: '1-5 employees',
        decision_maker_name: 'John Smith',
        email: 'john@johnsplumbing.com.au',
        phone: '+61 2 9876 5432',
        technology_stack: ['WordPress', 'Google Workspace'],
        pain_signals: ['Missed calls', 'Manual booking', 'No after-hours service'],
        enrichment_data: {
          confidence: 0.85,
          source: 'Google Maps',
          verified_at: new Date().toISOString(),
        },
        module_fit_scores: {
          'tradie-receptionist': 85,
          'contract-analysis': 40,
        },
        overall_score: 75,
        status: 'new',
        source: 'google_maps_scrape',
      },
      {
        business_name: 'Spark Electric',
        website: 'https://sparkelectric.com.au',
        industry: 'Electrical',
        location_city: 'Melbourne',
        location_state: 'VIC',
        location_country: 'AU',
        size_estimate: '5-10 employees',
        decision_maker_name: 'Sarah Johnson',
        email: 'sarah@sparkelectric.com.au',
        phone: '+61 3 9123 4567',
        technology_stack: ['ServiceM8', 'Xero'],
        pain_signals: ['Slow response time', 'Booking conflicts', 'Customer complaints'],
        enrichment_data: {
          confidence: 0.92,
          source: 'LinkedIn',
          verified_at: new Date().toISOString(),
        },
        module_fit_scores: {
          'tradie-receptionist': 90,
          'contract-analysis': 35,
        },
        overall_score: 82,
        status: 'contacted',
        source: 'linkedin_outreach',
      },
      {
        business_name: 'BuildRight Construction',
        website: 'https://buildright.com.au',
        industry: 'Construction',
        location_city: 'Brisbane',
        location_state: 'QLD',
        location_country: 'AU',
        size_estimate: '10-20 employees',
        decision_maker_name: 'Mike Chen',
        email: 'mike@buildright.com.au',
        phone: '+61 7 3456 7890',
        technology_stack: ['Procore', 'MYOB'],
        pain_signals: ['Contract disputes', 'Payment delays', 'Legal issues'],
        enrichment_data: {
          confidence: 0.78,
          source: 'Google Maps',
          verified_at: new Date().toISOString(),
        },
        module_fit_scores: {
          'tradie-receptionist': 50,
          'contract-analysis': 75,
        },
        overall_score: 60,
        status: 'engaged',
        source: 'referral',
      },
      {
        business_name: 'Clarke & Associates',
        website: 'https://clarkelegal.com.au',
        industry: 'Legal Services',
        location_city: 'Sydney',
        location_state: 'NSW',
        location_country: 'AU',
        size_estimate: '5-10 employees',
        decision_maker_name: 'Emma Clarke',
        email: 'emma@clarkelegal.com.au',
        phone: '+61 2 8765 4321',
        technology_stack: ['Clio', 'Office 365'],
        pain_signals: ['Manual contract review', 'Time-consuming research'],
        enrichment_data: {
          confidence: 0.88,
          source: 'Law Society Directory',
          verified_at: new Date().toISOString(),
        },
        module_fit_scores: {
          'tradie-receptionist': 20,
          'contract-analysis': 70,
        },
        overall_score: 45,
        status: 'new',
        source: 'content_marketing',
      },
      {
        business_name: 'Bean Counter Cafe',
        website: 'https://beancounter.com.au',
        industry: 'Hospitality',
        location_city: 'Melbourne',
        location_state: 'VIC',
        location_country: 'AU',
        size_estimate: '1-5 employees',
        decision_maker_name: 'Lisa Park',
        email: 'lisa@beancounter.com.au',
        phone: '+61 3 9876 5432',
        technology_stack: ['Square', 'Instagram'],
        pain_signals: ['Supplier contracts', 'Lease negotiations'],
        enrichment_data: {
          confidence: 0.65,
          source: 'Google Maps',
          verified_at: new Date().toISOString(),
        },
        module_fit_scores: {
          'tradie-receptionist': 15,
          'contract-analysis': 60,
        },
        overall_score: 55,
        status: 'qualified',
        source: 'google_ads',
      },
    ])
    .select()

  if (prospects.error) {
    console.error('❌ Error seeding prospects:', prospects.error)
    throw prospects.error
  }

  console.log(`✅ Created ${prospects.data.length} prospects`)

  // ============================================================================
  // SEED CUSTOMERS
  // ============================================================================
  console.log('Creating test customers...')

  const customers = await supabase
    .from('customers')
    .insert([
      {
        auth_user_id: null, // Will be linked after auth is set up
        name: 'Test Customer 1',
        email: 'customer1@test.com',
        company: 'Test Company Pty Ltd',
        status: 'active',
        lifetime_value: 99.0,
        health_score: 85,
        metadata: {
          signup_source: 'landing_page',
          onboarding_completed: true,
        },
      },
      {
        auth_user_id: null, // Will be linked after auth is set up
        name: 'Test Customer 2',
        email: 'customer2@test.com',
        company: 'Another Business',
        status: 'active',
        lifetime_value: 179.0,
        health_score: 92,
        nps_score: 9,
        metadata: {
          signup_source: 'referral',
          onboarding_completed: true,
        },
      },
    ])
    .select()

  if (customers.error) {
    console.error('❌ Error seeding customers:', customers.error)
    throw customers.error
  }

  console.log(`✅ Created ${customers.data.length} customers`)

  // ============================================================================
  // SEED INTERACTIONS
  // ============================================================================
  console.log('Creating test interactions...')

  const interactions = await supabase
    .from('interactions')
    .insert([
      // Prospect interactions
      {
        entity_type: 'prospect',
        entity_id: prospects.data[0].id,
        channel: 'email',
        interaction_type: 'outreach_sent',
        content: 'Initial outreach email about AI receptionist',
        outcome: 'sent',
        metadata: {
          campaign: 'tradie_cold_outreach_v1',
        },
      },
      {
        entity_type: 'prospect',
        entity_id: prospects.data[1].id,
        channel: 'email',
        interaction_type: 'outreach_opened',
        content: 'Outreach email opened',
        outcome: 'engaged',
        sentiment_score: 0.6,
        metadata: {
          campaign: 'tradie_cold_outreach_v1',
        },
      },
      {
        entity_type: 'prospect',
        entity_id: prospects.data[2].id,
        channel: 'email',
        interaction_type: 'demo_booked',
        content: 'Prospect booked contract analysis demo',
        outcome: 'conversion',
        sentiment_score: 0.8,
        metadata: {
          demo_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      // Customer interactions
      {
        entity_type: 'customer',
        entity_id: customers.data[0].id,
        channel: 'web',
        interaction_type: 'signup',
        content: 'Customer signed up via landing page',
        outcome: 'completed',
        sentiment_score: 0.9,
        metadata: {
          source: 'landing_page',
        },
      },
      {
        entity_type: 'customer',
        entity_id: customers.data[1].id,
        channel: 'chat',
        interaction_type: 'support_ticket',
        content: 'Asked about billing cycle change',
        outcome: 'resolved',
        sentiment_score: 0.7,
        metadata: {
          resolution_time_hours: 2,
        },
      },
    ])
    .select()

  if (interactions.error) {
    console.error('❌ Error seeding interactions:', interactions.error)
    throw interactions.error
  }

  console.log(`✅ Created ${interactions.data.length} interactions`)

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n🎉 Seeding complete!')
  console.log(`   - ${prospects.data.length} prospects`)
  console.log(`   - ${customers.data.length} customers`)
  console.log(`   - ${interactions.data.length} interactions`)
  console.log('\nVerify data in Supabase Dashboard → Table Editor')
}

// Run the seed
seed().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
