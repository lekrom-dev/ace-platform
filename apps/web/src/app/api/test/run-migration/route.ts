/**
 * Run Migration Endpoint
 * Applies the emergency_number migration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    // Add emergency_number column
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE tradie_configs
        ADD COLUMN IF NOT EXISTS emergency_number TEXT;

        COMMENT ON COLUMN tradie_configs.emergency_number IS 'Optional separate emergency number for direct call transfer. If not set, emergencies trigger SMS alerts only.';
      `,
    })

    if (error) {
      // Try alternative approach using raw query
      console.log('RPC failed, trying direct query...')

      // This won't work directly, but we can use the SQL in Supabase dashboard
      return NextResponse.json({
        success: false,
        error: error.message,
        instruction: 'Please run this SQL in Supabase SQL Editor',
        sql: `
ALTER TABLE tradie_configs
ADD COLUMN IF NOT EXISTS emergency_number TEXT;

COMMENT ON COLUMN tradie_configs.emergency_number IS 'Optional separate emergency number for direct call transfer. If not set, emergencies trigger SMS alerts only.';
        `,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully!',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        instruction: 'Please run this SQL in Supabase SQL Editor',
        sql: `
ALTER TABLE tradie_configs
ADD COLUMN IF NOT EXISTS emergency_number TEXT;

COMMENT ON COLUMN tradie_configs.emergency_number IS 'Optional separate emergency number for direct call transfer. If not set, emergencies trigger SMS alerts only.';
      `,
      },
      { status: 500 },
    )
  }
}
