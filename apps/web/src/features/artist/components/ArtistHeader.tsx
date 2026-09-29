import { useState } from "react";
import { Mic2, Calendar, MapPin } from "lucide-react";
import { useArtistArtwork } from "../api/queries/useArtistDetail";

interface ArtistHeaderProps {
  artist: any;
}

export function ArtistHeader({ artist }: ArtistHeaderProps) {
  const { data: artworkUrl } = useArtistArtwork(artist?.mbid);
  const [imageError, setImageError] = useState(false);

  if (!artist) return null;

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end w-full relative z-10 pt-10">
      <div className="w-48 h-48 md:w-56 md:h-56 shrink-0 relative group">
        <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md flex items-center justify-center">
          {!imageError && artworkUrl ? (
            <img
              src={artworkUrl}
              alt={artist.name}
              className="w-full h-full object-cover rounded-full"
              onError={() => setImageError(true)}
            />
          ) : (
            <Mic2 size={64} className="text-white/20" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 text-center md:text-left flex-1 min-w-0">
        <span className="text-sm font-medium tracking-widest uppercase text-white/70">
          {artist.type || "Artist"}
        </span>

        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight break-words">
          {artist.name}
        </h1>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-white/70 mt-2">
          {artist.area && (
            <div className="flex items-center gap-1.5">
              <MapPin size={16} />
              <span>{artist.area.name}</span>
            </div>
          )}

          {artist.beginDate && (
            <div className="flex items-center gap-1.5">
              <Calendar size={16} />
              <span>
                {artist.beginDate.split("-")[0]}
                {artist.endDate ? ` - ${artist.endDate.split("-")[0]}` : " - Present"}
              </span>
            </div>
          )}
        </div>

        {artist.tags?.length > 0 && (
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
            {artist.tags.slice(0, 5).map((tag: any) => (
              <span
                key={tag.id}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/5 text-white/80"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
