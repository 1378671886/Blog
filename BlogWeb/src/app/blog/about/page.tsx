import VideoBackground from "@/components/VideoBackground";

export default function About() {
  return (
    <div className="relative min-h-screen">
      <VideoBackground src="/videos/柠檬_1.mp4" />

      {/* 前景内容 */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-10 shadow-xl">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">关于我</h1>

          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              你好，这里是我的个人博客。一个用 Next.js 搭建的写作空间。
            </p>
            <p>
              目前是一名开发者，对技术保持好奇，喜欢探索新的事物。
            </p>
            <p>
              这个博客主要用来记录学习过程中的收获、解决过的问题，以及一些随想。
            </p>
            <p>
              如果有任何想法或建议，欢迎交流。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
