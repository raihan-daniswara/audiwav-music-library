import { Disc3, ArrowLeft } from "lucide-react";
import { useAlbumDetail } from "@/features/album/api/queries/useAlbumDetail";
import { AlbumBackground } from "@/features/album/components/AlbumBackground";
import { AlbumHeader } from "@/features/album/components/AlbumHeader";
import { AlbumTrackList } from "@/features/album/components/AlbumTrackList";

export function AlbumPage({
  mbid,
  onBack,
}: {
  mbid: string;
  onBack: () => void;
}) {
  const { data: detail, isLoading, error } = useAlbumDetail(mbid);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-6 animate-pulse">
        <div className="flex gap-6 items-end">
          <div className="w-40 h-40 bg-white/5 rounded-xl border border-white/10" />
          <div className="flex flex-col gap-3 flex-1 pb-2">
            <div className="h-4 w-16 bg-white/10 rounded" />
            <div className="h-8 w-3/4 bg-white/10 rounded my-1" />
            <div className="h-4 w-1/3 bg-white/5 rounded" />
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-8">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-white/[0.02] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 text-white/50 gap-4">
        <Disc3 size={48} className="opacity-50" />
        <p>Gagal memuat detail album.</p>
        <button
          onClick={onBack}
          className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          Kembali ke Pencarian
        </button>
      </div>
    );
  }

  const { album, artists, tracks } = detail;
  const albumArtist =
    artists && artists.length > 0
      ? artists[0]?.name || "Unknown Artist"
      : "Unknown Artist";

  return (
    <div className="relative min-h-full pb-12">
      <AlbumBackground artworkUrl={album?.artwork?.url} />

      <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-8">
        <div className="flex items-center gap-2 text-white/70 font-medium">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <span>Album</span>
        </div>

        <AlbumHeader
          album={album!}
          tracks={tracks || []}
          albumArtist={albumArtist}
        />

        <AlbumTrackList
          tracks={tracks || []}
          album={album!}
          albumArtist={albumArtist}
        />
      </div>
    </div>
  );
}
