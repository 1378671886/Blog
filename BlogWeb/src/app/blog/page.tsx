"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getPosts } from "@/lib/posts";
import VideoBackground from "@/components/VideoBackground";

function FadeIn({
  children,
  delay = 0,
  duration = 1000,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

function AnimatedHeading({
  text,
  charDelay = 30,
  initialDelay = 200,
}: {
  text: string;
  charDelay?: number;
  initialDelay?: number;
}) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), initialDelay);
    return () => clearTimeout(timer);
  }, [initialDelay]);

  const lines = text.split("\n");
  const charsPerLine = lines.map((l) => l.length);

  return (
    <h1
      className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal mb-4 leading-tight"
      style={{ letterSpacing: "-0.04em" }}
    >
      {lines.map((line, li) => {
        const prevLinesChars = charsPerLine
          .slice(0, li)
          .reduce((sum, len) => sum + len, 0);
        return line.split("").map((char, ci) => {
          const delay = prevLinesChars * charDelay + ci * charDelay;
          return (
            <span
              key={`${li}-${ci}`}
              className="inline-block"
              style={{
                opacity: started ? 1 : 0,
                transform: started ? "translateX(0)" : "translateX(-18px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "500ms",
                transitionDelay: `${delay}ms`,
              }}
            >
              {char === " " ? " " : char}
            </span>
          );
        });
      })}
    </h1>
  );
}

export default function BlogPage() {
  const posts = getPosts();

  return (
    <div className="relative">
      <VideoBackground src="/videos/柠檬_1.mp4" />

      {/* 前景内容 */}
      <div className="relative z-10">
        {/* 固定导航栏 */}
        <div className="sticky top-0 z-20 px-6 md:px-12 lg:px-16 pt-6">
          <nav className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              主界面
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
              <Link href="/blog" className="hover:text-white transition-colors">
                博客
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                语音
              </Link>
              <Link href="/blog/about" className="hover:text-white transition-colors">
                关于
              </Link>
            </div>

            <Link
              href="#"
              className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              开始聊天
            </Link>
          </nav>
        </div>

        {/* Hero 区域 */}
        <div className="h-screen flex flex-col justify-end px-6 md:px-12 lg:px-16 pb-12 lg:pb-16 -mt-[72px]">
          <div className="lg:grid lg:grid-cols-2 lg:items-end">
            <div>
              <AnimatedHeading text="我的个人博客" />

              <FadeIn delay={800} duration={1000}>
                <p className="text-base md:text-lg text-gray-300 mb-5">
                  记录思考，创造价值，探索技术的无限可能。
                </p>
              </FadeIn>

              <FadeIn delay={1200} duration={1000}>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="#"
                    className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    开始聊天
                  </Link>
                  <a
                    href="#posts"
                    className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium hover:bg-white hover:text-black transition-all"
                  >
                    探索更多
                  </a>
                </div>
              </FadeIn>
            </div>

            <div className="flex items-end justify-start lg:justify-end mt-8 lg:mt-0">
              <FadeIn delay={1400} duration={1000}>
                <div className="liquid-glass border border-white/20 px-6 py-3 rounded-xl">
                  <span className="text-lg md:text-xl lg:text-2xl font-light text-white">
                    记录 · 创造 · 分享
                  </span>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>

        {/* 博客文章区域 — 视频直接透出 */}
        <div id="posts" className="py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold mb-2 text-white">欢迎来访 👋</h2>
            <p className="text-gray-400 mb-12 text-lg">记录想法，分享学习。</p>

            <div className="grid gap-8 md:grid-cols-2">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/posts/${post.slug}`}
                  className="group block rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all bg-white/10 backdrop-blur-sm"
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
                    <h2 className="mt-1 text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-12 relative h-64 rounded-xl overflow-hidden">
              <Image
                src="/images/c45595ad653c209be35199a39c77dd59.jpg"
                alt="banner"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <p className="text-white text-2xl font-semibold">更多精彩内容，持续更新中</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
