import { motion, AnimatePresence } from "framer-motion";

interface AlbumBackgroundProps {
  artworkUrl?: string | null;
}

export function AlbumBackground({ artworkUrl }: AlbumBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <AnimatePresence mode="wait">
        {artworkUrl && (
          <motion.div
            key={artworkUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              // Masking trik: membuat pinggiran (kiri/kanan/atas/bawah) memudar menjadi transparan,
              // sehingga warna blur hanya terpancar kuat di tengah!
              maskImage: "radial-gradient(ellipse at 50% 40%, black 0%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 10%, transparent 70%)"
            }}
          >
            {/* Supaya gambar tidak melengkung lonjong saat div-nya memanjang sangat tinggi ke bawah 
                (karena list lagu banyak), kita kunci gambar blurnya menggunakan bentangan luas */}
            <div className="absolute -inset-[100%] origin-center animate-[spin_60s_linear_infinite]">
              <img
                src={artworkUrl}
                alt=""
                className="w-full h-full object-cover scale-[1] blur-[10px] mix-blend-screen opacity-[0.4]"
              />
            </div>

            {/* Gradient mask merata tambahan untuk meredam kecerahan di area teks */}
            <div className="absolute inset-0 bg-[#0f0f0f]/40" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f0f0f]/20 to-[#0f0f0f]/70" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
