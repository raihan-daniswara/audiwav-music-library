import {
  Home,
  Search,
  Disc3,
  Mic2,
  ListMusic,
  Settings,
  Music,
  Compass,
  Heart,
  Clock,
  Radio,
} from "lucide-react";
import type { NavSectionConfig, NavItemConfig } from "./NavItem";

/**
 * Konfigurasi menu sidebar.
 * Jika ingin menambah menu baru, cukup masukkan icon dan label di section yang sesuai!
 */
export const SIDEBAR_NAV_SECTIONS: NavSectionConfig[] = [
  {
    title: "Discover",
    items: [
      { id: "home", label: "Home", icon: Home },
      { id: "search", label: "Search", icon: Search },
      { id: "explore", label: "Explore", icon: Compass },
      { id: "radio", label: "Radio", icon: Radio },
    ],
  },
  {
    title: "My Library",
    items: [
      { id: "songs", label: "Songs", icon: Music },
      { id: "albums", label: "Albums", icon: Disc3 },
      { id: "artists", label: "Artists", icon: Mic2 },
    ],
  },
  {
    title: "Playlists",
    items: [
      { id: "favorites", label: "Favorites", icon: Heart },
      { id: "recently-played", label: "Recently Played", icon: Clock },
      { id: "custom-playlists", label: "All Playlists", icon: ListMusic },
    ],
  },
];

export const SIDEBAR_BOTTOM_ITEMS: NavItemConfig[] = [
  { id: "settings", label: "Settings", icon: Settings },
];
