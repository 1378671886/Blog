import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-white/70 backdrop-blur-md border-b border-white/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/blog" className="font-bold text-xl text-gray-800 hover:text-gray-600 transition-colors">
            My Blog
          </Link>
          <nav className="flex gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">主页</Link>
            <Link href="/blog" className="hover:text-gray-900 transition-colors">博客</Link>
            <Link href="/blog/about" className="hover:text-gray-900 transition-colors">关于</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-white/50 backdrop-blur-md py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} 刘子瑞的博客
      </footer>
    </>
  );
}
