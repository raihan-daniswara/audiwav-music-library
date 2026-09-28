import React from "react";

export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto select-text relative z-0 custom-scrollbar">
      <div className="h-full px-6 pb-24 relative">{children}</div>
    </main>
  );
}
