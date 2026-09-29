import { HomeHeader, QuickPicks, RecentActivity } from "@/features/home";

export function HomePage() {
  return (
    <div className="flex flex-col gap-6 p-6 min-h-[calc(100vh-2rem)] pb-32 animate-in fade-in duration-500">
      <HomeHeader />
      <QuickPicks />
      <RecentActivity />

      {/* Decorative Spacer Message */}
      <div className="mt-12 text-center text-white/30 text-xs font-medium bg-white/5 py-4 rounded-xl border border-white/5 max-w-lg mx-auto w-full">
         Top Charts & Recommendation Features are coming soon!
      </div>
    </div>
  );
}
