export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1">{children}</main>
      <footer className="bg-black/30 backdrop-blur-sm py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} 刘子瑞的博客
      </footer>
    </>
  );
}
