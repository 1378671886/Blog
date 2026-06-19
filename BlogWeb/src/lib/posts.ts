export interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  cover: string;
  content: string;
}

const posts: Post[] = [
  {
    slug: "hello-world",
    title: "你好，世界",
    date: "2026-06-01",
    excerpt: "这是我的第一篇博客文章，记录了我搭建这个博客的过程。",
    cover: "/images/289cd3d9a863d9d15858e583e899c6a6.jpg",
    content: `
## 为什么写博客？

想了很久，终于决定开始写博客了。选择一个简单的技术方案来搭建它。

## 技术选型

这个博客使用 **Next.js** 构建，原因很简单：

- React 生态成熟，社区活跃
- 文件系统路由，零配置
- Markdown 写文章，用 Git 管理版本
- Vercel 一键部署，免费

## 搭建过程

整个过程非常顺利，从初始化项目到第一篇文章发布，只用了一个下午。

\`\`\`
npx create-next-app@latest blog
\`\`\`

一个命令，项目就初始化好了。然后写了几行代码搭建页面布局，就开始写这篇文章了。

## 下一步

接下来打算继续完善这个博客的功能：

- 支持 Markdown 文件直接渲染
- 添加标签和分类
- 接入评论系统
- 优化 SEO

慢慢来吧，先确保能坚持写下去。
    `,
  },
  {
    slug: "nextjs-guide",
    title: "Next.js 入门指南",
    date: "2026-06-05",
    excerpt: "从零开始了解 Next.js，涵盖路由、布局、数据获取等核心概念。",
    cover: "/images/232e0c4a83aa3179f9e3bbafecf22209.jpg",
    content: `
## Next.js 是什么？

Next.js 是一个基于 React 的全栈框架，它提供了开箱即用的路由、渲染和数据获取方案。

## 核心概念

### 文件系统路由

Next.js 使用文件系统来定义路由。在 \`app\` 目录下创建文件夹和文件，就自动生成了对应的路由：

- \`app/page.tsx\` → \`/\`
- \`app/about/page.tsx\` → \`/about\`
- \`app/posts/[slug]/page.tsx\` → \`/posts/hello-world\`

### 服务端组件

默认情况下，Next.js 中的组件都是 React Server Component，在服务端渲染，不会发送大量 JS 到客户端。这使得页面加载更快。

### 布局系统

通过 \`layout.tsx\` 文件可以创建共享布局，导航时布局保持状态不重新渲染。

## 为什么选它做博客？

对于个人博客来说，Next.js 提供了几个很好的特性：

1. **SSG（静态生成）**：构建时生成静态 HTML，访问速度快
2. **SEO 友好**：服务端渲染，搜索引擎可以正确索引
3. **部署简单**：推送到 GitHub，Vercel 自动部署
    `,
  },
  {
    slug: "why-write-blog",
    title: "为什么要写博客",
    date: "2026-06-08",
    excerpt: "写博客不仅仅是记录，更是思考、学习和分享的过程。",
    cover: "/images/34556e1b810885be78178db9faa5dcea.jpg",
    content: `
## 写作是最好的思考

写博客的第一个理由很简单：**写作强迫你想清楚**。

当你尝试把一件事写下来给别人看的时候，你会发现很多自己以为懂了的地方其实很模糊。写作是一个"查漏补缺"的过程。

## 记录成长的轨迹

回头看一年前写的代码或者想法，常常会觉得当时的自己很幼稚。这其实是件好事——说明你在成长。博客就是你成长的见证。

## 建立自己的数字名片

在互联网上，你的博客就是你的名片。技术面试官搜索你的名字时，一个持续更新的技术博客比任何简历都有说服力。

## 帮助他人

你可能花了一整天解决了一个问题，写下来分享出去，也许就能帮到同样遇到这个问题的人。互联网的很大一部分价值就来自于这种知识分享。

## 如何坚持

- **不要追求完美**：写就完了，先发出来再改
- **保持节奏**：一周一篇比一天十篇好
- **写自己真正感兴趣的**：真诚的内容读者能感受到
    `,
  },
];

export function getPosts(): Post[] {
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
