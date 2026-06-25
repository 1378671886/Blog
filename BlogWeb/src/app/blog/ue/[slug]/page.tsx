"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import VideoBackground from "@/components/VideoBackground";
import { getUEProject } from "@/lib/ue-projects";

export default function UEProjectPage() {
  const params = useParams();
  const project = getUEProject(params.slug as string);

  if (!project) {
    return (
      <div className="relative min-h-screen">
        <VideoBackground src="/videos/柠檬_1.mp4" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">项目未找到</h1>
            <Link href="/blog/ue" className="text-blue-400 hover:text-blue-300 transition-colors">
              ← 返回专栏
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <VideoBackground src="/videos/柠檬_1.mp4" />

      <div className="relative z-10">
        {/* 导航栏 */}
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
              <Link href="/blog/ue" className="hover:text-white transition-colors">
                专栏
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

        {/* 面包屑 */}
        <div className="pt-24 pb-4 px-6 md:px-12 lg:px-16">
          <Link
            href="/blog/ue"
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 hover:border-white/30 text-white/80 hover:text-white px-4 py-2 rounded-xl text-sm transition-all hover:bg-white/15 hover:-translate-x-0.5 group"
          >
            <span className="text-base group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>返回专栏</span>
          </Link>
        </div>

        {/* 项目详情 */}
        <div className="px-6 md:px-12 lg:px-16 pb-16">
          <div className="max-w-3xl mx-auto">
            {/* 封面图 */}
            <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-8 border border-white/10">
              <Image
                src={project.cover}
                alt={project.title}
                fill
                className="object-cover"
              />
            </div>

            {/* 标题 */}
            <h1
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
            >
              {project.title}
            </h1>

            {/* 观看视频按钮 */}
            <a
              href={project.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-blue-500/50 hover:bg-blue-500/70 text-white px-8 py-3.5 rounded-xl text-base font-medium transition-colors mb-8"
            >
              <span className="text-xl">▶</span> 在 Bilibili 观看视频
            </a>

            {/* 详细描述 */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-white mb-4">项目介绍</h2>
              <p className="text-white/85 leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
