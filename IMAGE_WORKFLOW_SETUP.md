# 🖼️ Seamless Image Workflow Setup Guide

This guide explains how to set up the seamless image workflow in your Tailwind Next.js blog editor.

## 🎯 **What This Workflow Achieves**

1. **Image Upload** → Immediately visible in MDX preview
2. **Save MDX** → Pushes both MDX and images to GitHub  
3. **Vercel Auto-Redeploy** → Blog published with images rendered
4. **Seamless Experience** → No manual steps required

## 🔧 **Environment Variables Setup**

Add these to your Vercel environment variables:

```bash
# GitHub Integration (Required)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name

# Editor Authentication (Required)
EDITOR_USERS=username:password:author_name

# Vercel Auto-Redeploy (Optional but Recommended)
VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/your_webhook_id
```

## 📋 **How to Get These Values**

### **GitHub Token**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` scope
3. Copy the token

### **GitHub Owner & Repo**
- **Owner**: Your GitHub username
- **Repo**: Your repository name (e.g., `tailwind-nextjs-starter-blog`)

### **Vercel Deploy Hook**
1. Go to your Vercel project dashboard
2. Settings → Git → Deploy Hooks
3. Create new hook with name "Blog Updates"
4. Copy the webhook URL

## 🚀 **How the Workflow Works**

### **1. Image Upload Process**
```
User uploads image → Stored in /tmp → Returns production URL → Visible in preview
```

- Images are temporarily stored in `/tmp/public/static/images/{slug}/`
- Editor returns the **final production path** (`/static/images/{slug}/{filename}`)
- Preview shows images via temporary API endpoint (`/api/editor/image/{slug}/{filename}`)

### **2. MDX Save Process**
```
Save clicked → MDX pushed to GitHub → Images committed → Vercel webhook triggered
```

- MDX content uses production image paths
- Images are committed to `public/static/images/{slug}/` in GitHub
- Vercel webhook triggers automatic redeployment

### **3. Production Rendering**
```
Vercel builds → Images available at /static/images/ → Blog displays correctly
```

- Images are served from static files
- No API calls needed in production
- Fast loading and optimal performance

## 🎨 **Editor Features**

### **Image Upload**
- Drag & drop or paste from clipboard
- Automatic slug-based organization
- Immediate preview in editor
- Production-ready URLs in MDX

### **Live Preview**
- Real-time MDX rendering
- Image loading states
- Fallback handling for preview vs production
- Responsive image display

### **GitHub Integration**
- Automatic commits on save
- Image and MDX versioning
- Commit history tracking
- Branch protection support

## 🔍 **Troubleshooting**

### **Images Not Showing in Preview**
1. Check browser console for errors
2. Verify `/tmp` directory permissions on Vercel
3. Check image API endpoint logs
4. Ensure slug is valid (alphanumeric + hyphens only)

### **Images Not Committing to GitHub**
1. Verify `GITHUB_TOKEN` has `repo` scope
2. Check `GITHUB_OWNER` and `GITHUB_REPO` values
3. Ensure repository exists and is accessible
4. Check GitHub API rate limits

### **Vercel Not Redeploying**
1. Verify `VERCEL_DEPLOY_HOOK` URL is correct
2. Check webhook permissions in Vercel
3. Ensure webhook is enabled for your project
4. Check Vercel logs for webhook errors

## 📁 **File Structure After Setup**

```
your-blog/
├── data/
│   └── blog/
│       └── your-post.mdx          # Contains /static/images/... URLs
├── public/
│   └── static/
│       └── images/
│           └── your-post/          # Images committed here
│               ├── 1234567890-image1.png
│               └── 1234567891-image2.jpg
└── app/
    └── api/
        └── editor/
            ├── upload/             # Handles image uploads
            ├── image/              # Serves preview images
            └── save/               # Commits to GitHub
```

## 🎉 **Result**

After setup, your workflow becomes:

1. **Write blog post** with image uploads
2. **Images appear immediately** in preview
3. **Click "Save MDX"** → Everything pushes to GitHub
4. **Vercel automatically redeploys** → Blog updates live
5. **Images render perfectly** in production

## 🆘 **Need Help?**

- Check the browser console for error messages
- Review Vercel function logs for API errors
- Verify all environment variables are set correctly
- Ensure GitHub repository permissions are correct

---

**Happy blogging! 🚀**
