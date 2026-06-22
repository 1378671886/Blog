import Link from "next/link";

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-dark">
      <div className="text-center px-6">
        <h1 className="text-5xl font-bold text-gray-200 mb-4 tracking-tight">
          刘子瑞
        </h1>
        <p className="text-lg text-gray-500 mb-16">
          Welcome to my world
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/blog"
            className="group px-10 py-4 rounded-2xl bg-[#2a2a2a] border border-gray-700 hover:border-gray-500 transition-all duration-300"
          >
            <span className="block text-gray-200 text-2xl font-semibold mb-1">
              📝 博客
            </span>
            <span className="text-sm text-gray-500 group-hover:text-gray-400">
              记录学习与思考
            </span>
          </Link>

          <Link
            href="/voice"
            className="group px-10 py-4 rounded-2xl bg-[#2a2a2a] border border-gray-700 hover:border-gray-500 transition-all duration-300"
          >
            <span className="block text-gray-200 text-2xl font-semibold mb-1">
              🎙️ 实时语音
            </span>
            <span className="text-sm text-gray-500 group-hover:text-gray-400">
              探索语音交互
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
