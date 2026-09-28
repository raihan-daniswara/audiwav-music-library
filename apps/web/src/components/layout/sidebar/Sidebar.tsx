import { useState } from "react";
import { NavSection, NavItem } from "./NavItem";
import {
  SIDEBAR_NAV_SECTIONS,
  SIDEBAR_BOTTOM_ITEMS,
} from "./navigation.config";

export function Sidebar() {
  const [activeId, setActiveId] = useState("home");

  return (
    <aside className="w-[240px] hidden md:flex flex-col bg-surface/30 border-r border-white/5 backdrop-blur-xl shrink-0 h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 shrink-0">
        <span className="font-bold text-lg tracking-wide text-white">
          Audiwav
        </span>
      </div>

      {/* Modular Nav Sections */}
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6 custom-scrollbar">
        {SIDEBAR_NAV_SECTIONS.map((section, idx) => (
          <NavSection
            key={section.title || idx}
            section={section}
            activeId={activeId}
            onItemClick={setActiveId}
          />
        ))}
      </div>

      {/* Bottom Fixed Nav (Settings, etc.) */}
      <div className="p-3 mt-auto shrink-0 border-t border-white/5 space-y-1">
        {SIDEBAR_BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            onClick={() => setActiveId(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}
