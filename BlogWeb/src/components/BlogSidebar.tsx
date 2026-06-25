"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/blog", label: "博客首页" },
  { href: "/blog/ue", label: "UE项目介绍" },
  { href: "/blog/about", label: "关于我" },
];

export default function BlogSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all backdrop-blur-md border
              ${
                active
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-black/30 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
          >
            {link.label}
          </Link>
        );
      })}
    </aside>
  );
}
