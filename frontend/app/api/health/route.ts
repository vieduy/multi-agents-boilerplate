import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'multi-agent-frontend',
    timestamp: new Date().toISOString(),
  });
}
