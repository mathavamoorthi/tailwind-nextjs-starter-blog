import { NextRequest, NextResponse } from 'next/server'

// Protect editor and related APIs with simple Basic Auth
const PROTECTED_PATHS = [/^\/editor(\/.*)?$/, /^\/api\/editor\//]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const shouldProtect = PROTECTED_PATHS.some((re) => re.test(pathname))
  if (!shouldProtect) return NextResponse.next()

  const auth = req.headers.get('authorization')
  const user = process.env.EDITOR_USER || 'admin'
  const pass = process.env.EDITOR_PASS || 'password'
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
  if (auth === expected) return NextResponse.next()

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Editor"',
    },
  })
}

export const config = {
  matcher: ['/editor/:path*', '/api/editor/:path*'],
}


