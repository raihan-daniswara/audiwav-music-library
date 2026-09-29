import { UserCircle2, ArrowLeft } from "lucide-react";
import { useArtistDetail } from "../../features/artist/api/queries/useArtistDetail";
import { ArtistHeader } from "../../features/artist/components/ArtistHeader";
import { ArtistTopTracks } from "../../features/artist/components/ArtistTopTracks";
import { ArtistAlbums } from "../../features/artist/components/ArtistAlbums";
import { ArtistBackground } from "../../features/artist/components/ArtistBackground";

interface ArtistPageProps {
  mbid: string;
  onBack: () => void;
}

export function ArtistPage({ mbid, onBack }: ArtistPageProps) {
  const { data: detail, isLoading, error } = useArtistDetail(mbid);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 px-6 pt-20 animate-pulse">
        {/* Skeleton Header */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end pt-10">
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-white/5" />
          <div className="flex flex-col gap-3 flex-1 w-full">
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-12 md:h-16 w-3/4 max-w-md bg-white/10 rounded" />
            <div className="h-5 w-48 bg-white/5 rounded mt-2" />
          </div>
        </div>
        
        {/* Skeleton Tracks */}
        <div className="mt-8 flex flex-col gap-3 max-w-5xl">
          <div className="h-6 w-32 bg-white/10 rounded mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 w-full bg-white/[0.02] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 text-white/50 gap-4">
        <UserCircle2 size={48} className="opacity-50" />
        <p>Gagal memuat profil artis.</p>
        <button
          onClick={onBack}
          className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          Kembali ke Pencarian
        </button>
      </div>
    );
  }

  const { artist, topTracks, releaseGroups } = detail;

  return (
    <div className="relative min-h-[calc(100vh-2rem)] pb-24">
      <ArtistBackground mbid={mbid} />

      <div className="relative z-10 flex flex-col px-6 pt-6 max-w-[1600px] mx-auto">
        {/* Tombol Back (disamakan dengan AlbumPage) */}
        <div className="flex items-center gap-2 text-white/70 font-medium">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <span>Artist</span>
        </div>

        <ArtistHeader artist={artist} />

        <ArtistTopTracks tracks={topTracks} />

        <ArtistAlbums albums={releaseGroups} />
      </div>
    </div>
  );
}
