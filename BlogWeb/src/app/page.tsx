import Link from "next/link";
import VideoBackground from "@/components/VideoBackground";

export default function Landing() {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen">
      <VideoBackground src="/videos/1.mp4" />

      {/* 遮罩 */}
      <div className="fixed inset-0 bg-black/50 z-[1]" />

      {/* 前景内容 */}
      <div className="relative z-10 text-center px-6">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          刘子瑞
        </h1>
        <p className="text-lg text-gray-300 mb-16">
          Welcome to my world
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mx-auto w-full max-w-lg">
          <Link
            href="/blog"
            className="group px-10 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:bg-white/20 transition-all duration-300 text-center"
          >
            <span className="block text-white text-2xl font-semibold mb-1">
              📝 博客
            </span>
            <span className="text-sm text-gray-300">
              记录学习与思考
            </span>
          </Link>

          <Link
            href="/voice"
            className="group px-10 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:bg-white/20 transition-all duration-300 text-center"
          >
            <span className="block text-white text-2xl font-semibold mb-1">
              🎙️ 实时语音
            </span>
            <span className="text-sm text-gray-300">
              探索语音交互
            </span>
          </Link>

          <Link
            href="/blog/ue"
            className="group px-10 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:bg-white/20 transition-all duration-300 text-center"
          >
            <span className="block text-white text-2xl font-semibold mb-1">
              🎮 UE 项目
            </span>
            <span className="text-sm text-gray-300">
              UE求职项目演示
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
