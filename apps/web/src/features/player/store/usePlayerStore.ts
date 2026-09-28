import { create } from "zustand";
import type { SearchResultItem } from "../../search";

export type AudioQualityId =
  | "HI_RES_192"
  | "HI_RES_96"
  | "CD_LOSSLESS"
  | "HIGH_AAC"
  | "STANDARD_AAC";

export interface AudioQualityPreset {
  id: AudioQualityId;
  format: "FLAC" | "AAC";
  label: string;
  bitDepth: string; // misal "24-bit" atau "16-bit"
  sampleRate: string; // misal "192 kHz" atau "44.1 kHz"
  bitrate: string; // misal "9,216 kbps"
  tag: string; // badge ringkas: "HI-RES", "LOSSLESS", "HQ"
  description: string;
}

export const AUDIO_QUALITY_PRESETS: AudioQualityPreset[] = [
  {
    id: "HI_RES_192",
    format: "FLAC",
    label: "Hi-Res Lossless (Studio Master)",
    bitDepth: "24-bit",
    sampleRate: "192 kHz",
    bitrate: "9,216 kbps",
    tag: "HI-RES LOSSLESS",
    description: "FLAC bit-perfect master audio. Rekomendasi DAC eksternal.",
  },
  {
    id: "HI_RES_96",
    format: "FLAC",
    label: "Hi-Res Lossless (Deluxe)",
    bitDepth: "24-bit",
    sampleRate: "96 kHz",
    bitrate: "4,608 kbps",
    tag: "HI-RES LOSSLESS",
    description: "FLAC studio definition dengan clarity vokal maksimal.",
  },
  {
    id: "CD_LOSSLESS",
    format: "FLAC",
    label: "Lossless (CD Quality)",
    bitDepth: "16-bit",
    sampleRate: "44.1 kHz",
    bitrate: "1,411 kbps",
    tag: "LOSSLESS",
    description: "FLAC kualitas CD original tanpa kompresi lossy.",
  },
  {
    id: "HIGH_AAC",
    format: "AAC",
    label: "High Quality (Compressed)",
    bitDepth: "16-bit",
    sampleRate: "44.1 kHz",
    bitrate: "320 kbps",
    tag: "HIGH",
    description: "Kompresi lossy efisien dengan fidelitas tinggi.",
  },
  {
    id: "STANDARD_AAC",
    format: "AAC",
    label: "Standard Quality (Data Saver)",
    bitDepth: "16-bit",
    sampleRate: "44.1 kHz",
    bitrate: "160 kbps",
    tag: "STANDARD",
    description: "Hemat kuota dan buffering instan.",
  },
];

interface PlayerState {
  currentTrack: SearchResultItem | null;
  isPlaying: boolean;
  audioQuality: AudioQualityId;
  volume: number;
  isMuted: boolean;
  setCurrentTrack: (track: SearchResultItem) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setAudioQuality: (quality: AudioQualityId) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  audioQuality: "HI_RES_192",
  volume: 0.8,
  isMuted: false,
  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setAudioQuality: (quality) => set({ audioQuality: quality }),
  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));
