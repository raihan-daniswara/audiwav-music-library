import type { LucideIcon } from "lucide-react";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string | number;
}

export interface NavSectionConfig {
  title?: string;
  items: NavItemConfig[];
}

interface NavItemProps {
  item: NavItemConfig;
  isActive: boolean;
  onClick?: () => void;
}

export function NavItem({ item, isActive, onClick }: NavItemProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer group ${
        isActive
          ? "bg-white/10 text-white font-semibold"
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon
          size={18}
          className={`shrink-0 transition-colors ${
            isActive ? "text-white" : "text-white/60 group-hover:text-white"
          }`}
        />
        <span className="truncate">{item.label}</span>
      </div>

      {item.badge !== undefined && (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
          {item.badge}
        </span>
      )}
    </button>
  );
}

interface NavSectionProps {
  section: NavSectionConfig;
  activeId?: string;
  onItemClick?: (id: string) => void;
}

export function NavSection({ section, activeId, onItemClick }: NavSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      {section.title && (
        <div className="px-3 pb-1 text-xs font-semibold text-white/40 uppercase tracking-wider">
          {section.title}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {section.items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            onClick={() => onItemClick?.(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
