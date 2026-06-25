"use client";

import Link from "next/link";
import Image from "next/image";
import VideoBackground from "@/components/VideoBackground";
import { getUEProjects } from "@/lib/ue-projects";

export default function UEPage() {
  const projects = getUEProjects();

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

        {/* 标题区 */}
        <div className="pt-24 pb-8 px-6 md:px-12 lg:px-16">
          <h1 className="text-3xl font-bold text-white">UE 项目展示</h1>
          <p className="text-gray-400 mt-2">Unreal Engine 项目介绍与视频展示</p>
        </div>

        {/* 项目卡片 */}
        <div className="max-w-4xl mx-auto px-6 pb-16">
          {projects.length === 0 ? (
            <p className="text-gray-400 text-center py-16">暂无项目，敬请期待</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {projects.map((project) => (
                <div
                  key={project.slug}
                  className="group rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all bg-white/10 backdrop-blur-sm"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={project.cover}
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-white">
                      {project.title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400 line-clamp-3">
                      {project.description}
                    </p>
                    <a
                      href={project.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      ▶ 观看视频
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
