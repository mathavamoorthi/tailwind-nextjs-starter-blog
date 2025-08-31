# Admin Authentication Setup

This document explains how to set up authentication for the admin dashboard.

## Overview

The system uses **two different authentication methods**:

1. **Editor Users** (`EDITOR_USERS`) - Uses **Basic Authentication popup** for `/editor` routes
2. **Admin Users** (`ADMIN_USERS`) - Uses **form-based authentication** for `/admin` routes

## Authentication Flow

### Editor Routes (`/editor/*`)
- **Basic Authentication popup** appears in browser
- Uses `EDITOR_USERS` environment variable
- Format: `username:password:author`

### Admin Routes (`/admin/*`)
- **Form-based login page** at `/admin/login`
- Uses `ADMIN_USERS` environment variable  
- Format: `username:password`
- No browser popup - clean user experience

## Environment Variables

### For Admin Access

Set the `ADMIN_USERS` environment variable with admin credentials:

```bash
# Single admin user
ADMIN_USERS=admin:adminpass123

# Multiple admin users (comma-separated)
ADMIN_USERS=admin1:pass1,admin2:pass2,superadmin:superpass
```

### For Editor Access

Set the `EDITOR_USERS` environment variable with editor credentials:

```bash
# Single editor user
EDITOR_USERS=writer:pass123:Author Name

# Multiple editor users (comma-separated)
EDITOR_USERS=writer1:pass1:John Doe,writer2:pass2:Jane Smith
```

### For GitHub Integration (Required for Production)

```bash
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name
```

## How It Works

1. **Editor Routes**: Middleware shows Basic Auth popup using `EDITOR_USERS`
2. **Admin Routes**: Middleware allows access, API routes check `ADMIN_USERS`
3. **Form Login**: Admin users log in via `/admin/login` form
4. **Credential Storage**: Admin credentials stored in localStorage
5. **API Protection**: Admin API routes validate credentials on each request

## Admin Approval Process

When an admin approves a draft post:

### Frontmatter Changes
- `draft: false` - Sets the post as published
- `status: "published"` - Updates the status
- `publishedAt: timestamp` - Records when it was published
- `approvedBy: "admin"` - Tracks who approved it

### File Operations
1. **Development**: Writes file locally to `data/blog/` and deletes from `data/drafts/`
2. **Production**: Commits directly to GitHub (handles read-only file system)
3. **GitHub**: Creates the post in `data/blog/` and deletes from `data/drafts/`

### Error Handling
- **Read-only file system**: Automatically falls back to GitHub commits
- **GitHub failures**: Returns detailed error messages
- **Missing configuration**: Clear error messages for missing environment variables

## Accessing the Admin Dashboard

1. Navigate to `/admin`
2. If not authenticated, you'll be redirected to `/admin/login`
3. Enter your admin credentials (no browser popup!)
4. You'll be redirected to the admin dashboard

## Troubleshooting

### "Two authentication prompts" issue

This was caused by having both Basic Auth popup AND form login. The fix:

1. ✅ **Editor routes**: Keep Basic Auth popup (using `EDITOR_USERS`)
2. ✅ **Admin routes**: Use form-based login only (using `ADMIN_USERS`)
3. ✅ **No more double authentication** for admin access

### "Read-only file system" error

This occurs in production environments (Vercel, etc.). The fix:

1. ✅ **GitHub integration**: Automatically commits to GitHub instead of local files
2. ✅ **Environment detection**: Detects production vs development
3. ✅ **Fallback handling**: Graceful error handling for file system issues

### Common Issues

1. **Wrong credentials**: Make sure your `ADMIN_USERS` environment variable is set correctly
2. **Environment not loaded**: Restart your development server after changing environment variables
3. **Browser cache**: Clear browser cache and localStorage if authentication issues persist
4. **GitHub permissions**: Ensure your GitHub token has write access to the repository

## Security Notes

- **Development**: Credentials are stored in localStorage
- **Production**: Use secure HTTP-only cookies instead of localStorage
- **HTTPS**: Always use HTTPS in production for Basic Authentication
- **Strong Passwords**: Use strong, unique passwords for admin accounts
- **GitHub Tokens**: Use fine-grained personal access tokens with minimal permissions

## Example Configuration

```bash
# .env.local
EDITOR_USERS=writer1:pass123:John Doe,writer2:pass456:Jane Smith
ADMIN_USERS=admin:adminpass123,superadmin:superpass456

# GitHub Integration (Required for production)
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your_username
GITHUB_REPO=your_repo_name

# Optional fallback for single users
EDITOR_USER=writer
EDITOR_PASS=password
EDITOR_AUTHOR=Default Author
ADMIN_USER=admin
ADMIN_PASS=admin
```

## User Experience

### Editor Access
- Browser shows Basic Auth popup
- Enter credentials once per session
- Works with any HTTP client

### Admin Access  
- Clean form-based login page
- No browser popup
- Better user experience
- Credentials stored in localStorage

### Admin Approval
- One-click approve/reject
- Automatic draft status management
- GitHub integration for production
- Clear success/error feedback
