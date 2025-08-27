import { NextRequest, NextResponse } from 'next/server'

// Protect editor and related APIs with Basic Auth (support multiple users)
const PROTECTED_PATHS = [/^\/editor(\/.*)?$/, /^\/api\/editor\//]

type EditorUser = {
  username: string
  password: string
  author: string
}

function parseUsersEnv(env: string | undefined): EditorUser[] {
  const input = (env || '').trim()
  if (!input) return []
  // Format: username:password:author,username2:password2:author2
  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [username = '', password = '', author = ''] = entry.split(':')
      return { username, password, author }
    })
    .filter((u) => u.username && u.password && u.author)
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const shouldProtect = PROTECTED_PATHS.some((re) => re.test(pathname))
  if (!shouldProtect) return NextResponse.next()

  const authHeader = req.headers.get('authorization') || ''
  const users = parseUsersEnv(process.env.EDITOR_USERS)

  let matchedUser: EditorUser | null = null

  if (users.length > 0) {
    for (const u of users) {
      const expected = 'Basic ' + Buffer.from(`${u.username}:${u.password}`).toString('base64')
      if (authHeader === expected) {
        matchedUser = u
        break
      }
    }
  } else {
    // Fallback to single user mode
    const user = process.env.EDITOR_USER || 'admin'
    const pass = process.env.EDITOR_PASS || 'password'
    const author = process.env.EDITOR_AUTHOR || 'default'
    const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
    if (authHeader === expected) {
      matchedUser = { username: user, password: pass, author }
    }
  }

  if (matchedUser) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-editor-user', matchedUser.username)
    requestHeaders.set('x-editor-author', matchedUser.author)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

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


