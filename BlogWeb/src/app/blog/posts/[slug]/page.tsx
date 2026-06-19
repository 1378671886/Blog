import { getPostBySlug, getPosts } from "@/lib/posts";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link
        href="/blog"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← 返回首页
      </Link>

      <article className="mt-8">
        <div className="relative h-72 rounded-xl overflow-hidden mb-10">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        <header className="mb-10">
          <time className="text-sm text-gray-400">{post.date}</time>
          <h1 className="text-3xl font-bold mt-2 mb-4">{post.title}</h1>
        </header>

        <Markdown remarkPlugins={[remarkGfm]}>{post.content}</Markdown>
      </article>
    </div>
  );
}
