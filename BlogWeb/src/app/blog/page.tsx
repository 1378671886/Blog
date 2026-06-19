import { getPosts } from "@/lib/posts";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const posts = getPosts();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2">欢迎来访 👋</h1>
      <p className="text-gray-500 mb-12 text-lg">记录想法，分享学习。</p>

      <div className="grid gap-8 md:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/posts/${post.slug}`}
            className="group block rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow bg-white"
          >
            <div className="relative h-48 overflow-hidden">
              <Image
                src={post.cover}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-5">
              <time className="text-xs text-gray-400">{post.date}</time>
              <h2 className="mt-1 text-lg font-semibold group-hover:text-blue-600 transition-colors">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                {post.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* 第四张图作为装饰 banner */}
      <div className="mt-12 relative h-64 rounded-xl overflow-hidden">
        <Image
          src="/images/c45595ad653c209be35199a39c77dd59.jpg"
          alt="banner"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <p className="text-white text-2xl font-semibold">更多精彩内容，持续更新中</p>
        </div>
      </div>
    </div>
  );
}
