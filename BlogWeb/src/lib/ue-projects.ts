export interface UEProject {
  slug: string;
  title: string;
  excerpt: string;
  description: string;
  cover: string;
  videoUrl: string;
}

const projects: UEProject[] = [
  {
    slug: "moba-dedicated-server",
    title: "多人 MOBA 竞技游戏项目",
    excerpt:
      "基于 UE5.6 开发的 MOBA 类多人竞技游戏，Dedicated Server + Coordinator 协调器动态分配游戏服，GAS 双属性集驱动战斗成长，AI 共用技能框架。",
    description:
      "基于 UE5.6 开发的 MOBA 类多人竞技游戏，Dedicated Server + 独立 Coordinator 协调器服务动态分配游戏服端口，玩家全部离开后自动回收服务器资源，保证部署弹性。采用 GAS 双属性集驱动角色战斗与成长体系，技能系统通过 Animation Notify 桥接 GAS 事件实现技能触发、连招切换与碰撞判定。大厅包含队伍分配与英雄选择流程，AI 系统行为树挂载 GAS 技能接口，与玩家共用同一套技能框架。背包系统实现道具购买与合成链路，通过索引表实现高效配方匹配。基于场上双方兵力与角色数量的动态权重对比推进战线，配合对象池复用的小兵单位持续驱动攻防节奏。",
    cover: "/images/OIP-C.jpg",
    videoUrl: "https://www.bilibili.com/video/BV1tm576NEax/",
  },
  {
    slug: "tps-network-sync",
    title: "TPS 网络同步射击项目",
    excerpt:
      "基于 UE5 开发的多人联网 TPS，Steam 联机支持，Server-Side Rewind 时间回溯滞后补偿，15+ 碰撞盒命中系统，Match 状态机驱动。",
    description:
      "基于 UE5 开发的多人联网第三人称射击游戏，支持 Steam 多人联机，包含完整匹配流程和计分系统，实现客户端-服务器权威架构。实现 Server-Side Rewind 服务器时间回溯滞后补偿系统，包含类 NTP 时间同步机制、高延迟检测与自动降级功能。命中盒伤害系统包含 15+ 个碰撞盒，支持爆头双倍伤害。动画方面包含 IK 握枪瞄准、Aim Offset 混合。采用 Match 状态机驱动游戏流程，集成 Steam 会话系统。技术栈：UE5 C++、网络同步、Server-Side Rewind、UMG。",
    cover: "/images/OIP-C.jpg",
    videoUrl: "https://www.bilibili.com/video/BV1R9RkBmEa3/",
  },
  {
    slug: "gas-melee-rpg",
    title: "GAS 近战动作 RPG 项目",
    excerpt:
      "基于 UE5.6 的第三人称近战动作 RPG，GAS 战斗框架、目标锁定、Enhanced Input、AI 行为树、Motion Warping 动画系统。",
    description:
      "基于 UE5.6 开发的第三人称近战动作 RPG，包含轻/重攻击、格挡、翻滚、目标锁定等完整战斗机制。基于 GAS 构建战斗框架，实现目标锁定系统、Enhanced Input 输入桥接、AI 敌人系统（视觉感知+行为树+人群避让）。动画方面包含 GameplayTag 驱动状态机、Motion Warping、Linked Anim Layer。采用组件化战斗设计，大量使用 NativeGameplayTags 和 DataAsset 配置驱动。技术栈：UE5.6 C++、GAS、Enhanced Input、行为树、Niagara、UMG。",
    cover: "/images/OIP-C.jpg",
    videoUrl: "https://www.bilibili.com/video/BV1bSRCBgEAj/",
  },
];

export function getUEProjects(): UEProject[] {
  return projects;
}

export function getUEProject(slug: string): UEProject | undefined {
  return projects.find((p) => p.slug === slug);
}
