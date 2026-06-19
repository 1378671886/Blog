import Link from "next/link";

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center px-6">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          刘子瑞
        </h1>
        <p className="text-lg text-purple-200/70 mb-16">
          Welcome to my world
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/blog"
            className="group px-10 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            <span className="block text-white text-2xl font-semibold mb-1">
              📝 博客
            </span>
            <span className="text-sm text-purple-200/60 group-hover:text-purple-200/80">
              记录学习与思考
            </span>
          </Link>

          <Link
            href="/voice"
            className="group px-10 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            <span className="block text-white text-2xl font-semibold mb-1">
              🎙️ 实时语音
            </span>
            <span className="text-sm text-purple-200/60 group-hover:text-purple-200/80">
              探索语音交互
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
