import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ensureDbInitialized } from '@/lib/db'

export async function middleware(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    try {
      await ensureDbInitialized()
    } catch (err) {
      console.error('DB initialization failed:', err)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
