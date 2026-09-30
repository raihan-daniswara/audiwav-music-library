import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MainContent } from "@/components/layout/main-content";
import { BottomPlayer } from "@/components/layout/bottom-player";
import { RightPanel } from "@/components/layout/right-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-white selection:bg-white/20">
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Dynamic Multi-Orb Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Orb 1: Purple Ambient Glow (Top-Left) */}
          <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full bg-purple-600/12 blur-[140px] animate-orbit-slow will-change-transform" />

          {/* Orb 2: Deep Blue/Indigo Glow (Center-Right) */}
          <div className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-600/10 blur-[150px] animate-orbit-reverse will-change-transform" />

          {/* Orb 3: Violet / Magenta Accent Glow (Bottom-Left) */}
          <div className="absolute bottom-[-15%] left-[25%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-violet-500/10 blur-[130px] animate-orbit-medium will-change-transform" />
        </div>

        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden relative z-0">
          <Topbar />

          <MainContent>{children}</MainContent>
        </div>

        <RightPanel />
      </div>

      <BottomPlayer />
    </div>
  );
}
