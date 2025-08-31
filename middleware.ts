import { NextRequest, NextResponse } from 'next/server'

// Protect editor and related APIs with Basic Auth (support multiple users)
const EDITOR_PATHS = [/^\/editor(\/.*)?$/, /^\/api\/editor\//]
const ADMIN_PATHS = [/^\/admin(\/.*)?$/, /^\/api\/admin\//]

type EditorUser = {
  username: string
  password: string
  author: string
}

type AdminUser = {
  username: string
  password: string
}

function parseEditorUsersEnv(env: string | undefined): EditorUser[] {
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

function parseAdminUsersEnv(env: string | undefined): AdminUser[] {
  const input = (env || '').trim()
  if (!input) return []
  // Format: username:password,username2:password2
  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [username = '', password = ''] = entry.split(':')
      return { username, password }
    })
    .filter((u) => u.username && u.password)
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Check if it's an editor path
  const isEditorPath = EDITOR_PATHS.some((re) => re.test(pathname))
  const isAdminPath = ADMIN_PATHS.some((re) => re.test(pathname))
  
  if (!isEditorPath && !isAdminPath) return NextResponse.next()

  const authHeader = req.headers.get('authorization') || ''

  // Handle editor authentication (Basic Auth popup)
  if (isEditorPath) {
    const users = parseEditorUsersEnv(process.env.EDITOR_USERS)
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

  // Handle admin authentication (Form-based, no Basic Auth popup)
  if (isAdminPath) {
    // For admin routes, we don't show Basic Auth popup
    // Instead, let the frontend handle authentication via forms
    // Only check if credentials are provided in the Authorization header
    
    const users = parseAdminUsersEnv(process.env.ADMIN_USERS)
    let matchedUser: AdminUser | null = null

    if (users.length > 0) {
      for (const u of users) {
        const expected = 'Basic ' + Buffer.from(`${u.username}:${u.password}`).toString('base64')
        if (authHeader === expected) {
          matchedUser = u
          break
        }
      }
    } else {
      // Fallback to single admin user mode
      const user = process.env.ADMIN_USER || 'admin'
      const pass = process.env.ADMIN_PASS || 'admin'
      const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
      if (authHeader === expected) {
        matchedUser = { username: user, password: pass }
      }
    }

    if (matchedUser) {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-admin-user', matchedUser.username)
      return NextResponse.next({ request: { headers: requestHeaders } })
    }

    // For admin routes, don't show Basic Auth popup
    // Let the frontend handle the authentication flow
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/editor/:path*', '/api/editor/:path*', '/admin/:path*', '/api/admin/:path*'],
}


