import { getPostBySlug, getPosts } from "@/lib/posts";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VideoBackground from "@/components/VideoBackground";

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
    <div className="relative min-h-screen">
      <VideoBackground src="/videos/柠檬_1.mp4" />

      {/* 前景内容 */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/blog"
          className="inline-block text-sm text-white/70 hover:text-white transition-colors mb-8 bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2"
        >
          ← 返回首页
        </Link>

        <article className="bg-white/60 backdrop-blur-md rounded-2xl p-8 md:p-12 shadow-xl">
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
            <time className="text-sm text-gray-500">{post.date}</time>
            <h1 className="text-3xl font-bold mt-2 mb-4 text-gray-900">{post.title}</h1>
          </header>

          <div className="prose max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{post.content}</Markdown>
          </div>
        </article>
      </div>
    </div>
  );
}
