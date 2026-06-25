export interface UEProject {
  slug: string;
  title: string;
  description: string;
  cover: string;
  videoUrl: string;
}

const projects: UEProject[] = [
  {
    slug: "ue-demo",
    title: "示例 UE 项目",
    description: "这是一个 Unreal Engine 示例项目，展示基础场景搭建与蓝图交互。",
    cover: "/images/289cd3d9a863d9d15858e583e899c6a6.jpg",
    videoUrl: "https://www.bilibili.com/video/BVxxx",
  },
];

export function getUEProjects(): UEProject[] {
  return projects;
}
