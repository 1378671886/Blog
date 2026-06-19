export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-10 shadow-sm">
        <h1 className="text-3xl font-bold mb-8">关于我</h1>

        <div className="space-y-4 text-gray-600 leading-relaxed">
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
  );
}
