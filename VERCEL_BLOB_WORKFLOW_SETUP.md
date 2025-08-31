# 🖼️ Vercel Blob Image Workflow Setup Guide

This guide explains how to set up the **Vercel Blob Storage image workflow** in your Tailwind Next.js blog editor.

## 🎯 **What This Workflow Achieves**

1. **Image Upload** → **Vercel Blob Storage** (immediate CDN availability)
2. **Instant Preview** → **CDN URLs** render images immediately in editor
3. **Publish Process** → **Download from Blob** → **Commit to GitHub** → **Update MDX URLs**
4. **Production Ready** → **Local image paths** work perfectly after build
5. **Auto-Redeploy** → **Vercel webhook** triggers rebuild automatically

## 🔧 **Environment Variables Setup**

Add these to your Vercel environment variables:

```bash
# Vercel Blob Storage (Required)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

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

### **Vercel Blob Storage Token**
1. Go to your Vercel dashboard
2. Storage → Blob → Create Store
3. Copy the `BLOB_READ_WRITE_TOKEN` from the store settings
4. This token allows your app to upload and read from Blob storage

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
User pastes/upload image → Vercel Blob Storage → CDN URL → Instant MDX preview
```

- **Immediate upload** to Vercel Blob Storage
- **CDN URL returned** for instant preview
- **No temporary files** - everything is cloud-based
- **Scalable storage** with automatic CDN distribution

### **2. Editor Preview Process**
```
MDX content with Blob URLs → Real-time rendering → Images visible immediately
```

- **Blob URLs work instantly** in the editor preview
- **No fallback complexity** - CDN ensures availability
- **Responsive images** with proper loading states
- **Professional preview** experience

### **3. Publish Process**
```
Save clicked → Process Blob URLs → Download images → Commit to GitHub → Update MDX → Vercel redeploy
```

- **Blob URLs detected** in MDX content
- **Images downloaded** from Blob storage
- **Committed to GitHub** under `public/static/images/{slug}/`
- **MDX URLs updated** to use local paths
- **Vercel webhook triggered** for automatic redeployment

### **4. Production Rendering**
```
Vercel builds → Images available at /static/images/ → Blog displays perfectly
```

- **Images served from static files** (fast and reliable)
- **No external dependencies** in production
- **Perfect performance** and SEO
- **CDN-backed** for global distribution

## 🎨 **Editor Features**

### **Image Upload**
- **Drag & drop** or **paste from clipboard**
- **Instant Vercel Blob upload** - no waiting
- **CDN URLs immediately** in MDX content
- **Automatic filename generation** with timestamps

### **Live Preview**
- **Real-time MDX rendering** with Blob URLs
- **Instant image display** from CDN
- **Responsive image handling**
- **Professional preview experience**

### **Publish Workflow**
- **Automatic Blob processing** on save
- **GitHub image commits** with proper organization
- **MDX URL transformation** for production
- **Vercel auto-redeploy** for live updates

## 🔍 **Troubleshooting**

### **Images Not Uploading to Vercel Blob**
1. Verify `BLOB_READ_WRITE_TOKEN` is set correctly
2. Check Vercel Blob store exists and is accessible
3. Ensure your Vercel project has Blob storage enabled
4. Check Vercel function logs for upload errors

### **Images Not Processing During Publish**
1. Verify `GITHUB_TOKEN` has `repo` scope
2. Check `GITHUB_OWNER` and `GITHUB_REPO` values
3. Ensure repository exists and is accessible
4. Check GitHub API rate limits

### **Vercel Not Redeploying**
1. Verify `VERCEL_DEPLOY_HOOK` URL is correct
2. Check webhook permissions in Vercel
3. Ensure webhook is enabled for your project
4. Check Vercel logs for webhook errors

### **Images Not Visible After Deploy**
1. Wait for Vercel build to complete (usually 1-2 minutes)
2. Check that images exist in `public/static/images/{slug}/`
3. Verify image URLs in MDX are correct
4. Check Vercel build logs for any errors

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
            ├── upload/             # Vercel Blob upload
            ├── process-blob-images/ # Process Blob URLs
            └── save/               # MDX + GitHub + Vercel webhook
```

## 🎉 **Result**

After setup, your workflow becomes **extremely smooth**:

1. **Write blog post** with image uploads (instant CDN preview)
2. **Images appear immediately** in editor preview
3. **Click "Save MDX"** → Everything processes automatically
4. **Vercel automatically redeploys** → Blog updates live
5. **Images render perfectly** in production with local paths

## 🆘 **Need Help?**

- Check the browser console for error messages
- Review Vercel function logs for API errors
- Verify all environment variables are set correctly
- Ensure Vercel Blob storage is enabled
- Check that GitHub repository permissions are correct
- Verify Vercel deploy hook is working

## 💰 **Vercel Blob Pricing**

- **Free tier**: 100MB storage, 100MB bandwidth/month
- **Pro tier**: $0.10/GB storage, $0.10/GB bandwidth
- **Enterprise**: Custom pricing

For most blogs, the free tier is sufficient. Images are automatically optimized and served via CDN.

---

**This workflow provides the best of both worlds: instant previews and production-ready images! 🚀**
