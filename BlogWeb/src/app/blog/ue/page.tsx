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

        {/* 标题区 */}
        <div className="pt-24 pb-8 px-6 md:px-12 lg:px-16">
          <h1 className="text-3xl font-bold text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>UE 项目展示</h1>
          <p className="text-white/80 mt-2" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>Unreal Engine 项目介绍与视频展示</p>
        </div>

        {/* 项目卡片 */}
        <div className="max-w-4xl mx-auto px-6 pb-16">
          {projects.length === 0 ? (
            <p className="text-white/60 text-center py-16">暂无项目，敬请期待</p>
          ) : (
            <div className="grid gap-6">
              {projects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/blog/ue/${project.slug}`}
                  className="group rounded-xl overflow-hidden border border-white/15 hover:border-white/40 transition-all bg-white/10 backdrop-blur-md flex flex-col md:flex-row"
                >
                  <div className="relative h-48 md:h-auto md:w-64 shrink-0 overflow-hidden">
                    <Image
                      src={project.cover}
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6 flex flex-col justify-center flex-1">
                    <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {project.title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                      {project.excerpt}
                    </p>
                    <span className="mt-3 text-blue-400 text-sm group-hover:translate-x-1 transition-transform inline-block">
                      查看详情 →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
