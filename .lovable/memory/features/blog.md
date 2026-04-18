---
name: Blog system
description: Full blog with categories, tags, comments, likes, rich-text editor (ReactQuill), SEO meta, featured posts. Admin/moderator only authoring.
type: feature
---
- Tables: blog_posts, blog_categories, blog_tags, blog_post_tags, blog_comments, blog_likes
- Storage bucket: blog-images (public, admin/mod upload only)
- Admin tab: AdminBlogManager (Posts/Categories/Tags sub-tabs, ReactQuill editor)
- Public routes: /blog (list + category filter + search), /blog/:slug (detail + comments + likes + share + related)
- Nav: Header desktop+mobile menu, Footer
- Authoring: admin + moderator only (RLS enforced)
- Comments/likes: any authenticated user
- SEO: meta_title/meta_description per post, document.title set on detail
- Slug auto-generated from title (AZ→latin map in src/lib/blog.ts)
