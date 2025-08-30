# GitHub Integration Setup Guide

This guide will help you set up automatic GitHub integration for your blog editor.

## What This Gives You

✅ **Automatic Git commits** when you publish posts  
✅ **Real-time repository sync** with your blog content  
✅ **Version control** for all your blog changes  
✅ **Collaboration** between multiple authors  
✅ **Backup** of all your content in GitHub  

## Step 1: Create GitHub Personal Access Token

1. **Go to GitHub Settings**:
   - Click your profile picture → Settings
   - Or visit: https://github.com/settings

2. **Navigate to Developer Settings**:
   - Scroll down to "Developer settings" (bottom left)
   - Click "Personal access tokens"
   - Click "Tokens (classic)"

3. **Generate New Token**:
   - Click "Generate new token (classic)"
   - Give it a descriptive name: `Blog Editor Integration`
   - Set expiration: Choose what works for you (90 days recommended)

4. **Select Scopes**:
   - ✅ **repo** (Full control of private repositories)
   - This gives access to read/write your repository

5. **Generate and Copy**:
   - Click "Generate token"
   - **IMPORTANT**: Copy the token immediately (you won't see it again!)
   - Store it securely

## Step 2: Get Repository Information

1. **Repository Owner**: Your GitHub username
2. **Repository Name**: Your blog repository name
3. **Branch**: Usually `main` (or `master` for older repos)

Example:
- Owner: `johndoe`
- Repo: `my-blog`
- Branch: `main`

## Step 3: Add Environment Variables

### Local Development (.env.local)
```bash
# GitHub Integration
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo-name

# Other required variables
REVALIDATION_SECRET=your-secret-here
EDITOR_USERS=username:password:author
```

### Vercel Deployment
1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable:
   - `GITHUB_TOKEN`: Your personal access token
   - `GITHUB_OWNER`: Your GitHub username
   - `GITHUB_REPO`: Your repository name

## Step 4: Test the Integration

1. **Deploy your changes** to Vercel
2. **Go to your editor**: `/editor`
3. **Check the status**: You should see a green "GitHub Integration" message
4. **Create a test post**:
   - Fill in the form
   - Click "Save"
   - You should see "Pushed to GitHub!" in the success message

## Step 5: Verify on GitHub

1. **Go to your GitHub repository**
2. **Check the commits**: You should see new commits from "Blog Editor"
3. **Check the files**: Your new posts should appear in `data/blog/`

## Troubleshooting

### ❌ "GitHub Integration: Not configured"
- Check your environment variables are set correctly
- Ensure `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` are all set
- Redeploy after adding environment variables

### ❌ "GitHub push error" in console
- Check your token has `repo` scope
- Verify repository name and owner are correct
- Ensure your token hasn't expired

### ❌ Posts not appearing on GitHub
- Check the editor success message for GitHub status
- Look for errors in browser console
- Verify your token has write access to the repository

## Security Notes

- **Never commit your `.env.local`** file
- **Use environment variables** in production
- **Rotate your token** regularly
- **Limit token scope** to only what's needed (`repo`)

## Advanced Configuration

### Custom Commit Messages
You can customize commit messages by modifying the `commitMessage` in `app/api/editor/save/route.ts`:

```typescript
const commitMessage = `Add/Update blog post: ${frontmatter.title}`
```

### Multiple Branches
To use a different branch, modify the branch parameter in the GitHub API calls.

## Support

If you're still having issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Test with a simple post first
4. Check GitHub repository permissions

## What Happens Now

With GitHub integration enabled:

1. **You write a post** in the editor
2. **Post is saved locally** and appears on your blog
3. **Post is automatically committed** to GitHub
4. **GitHub webhook triggers** (if configured)
5. **Pages are revalidated** for optimal performance

Your blog is now fully dynamic with automatic GitHub sync! 🎉
