# Audiwav Frontend UI/UX Design Guide & Progress Tracker

File ini berfungsi sebagai panduan pengembangan UI/UX sekaligus *progress tracker* untuk aplikasi frontend web Audiwav.

## 1. Overview & Vision
Audiwav adalah self-hosted/local music library dan music player yang berfokus pada koleksi musik lossless (khususnya FLAC).

**Design Direction:**
*   **Dark-first** & layaknya **Modern desktop application**.
*   **macOS-inspired** (Subtle glass / translucent surfaces, inspirasi dari macOS Tahoe).
*   **Minimal namun informatif**, berfokus pada *artwork* dan musik.
*   **Responsive & Smooth animation** (Motion ringan, premium).
*   *Bukan dashboard web biasa, dan tetap memiliki identitas sendiri (bukan clone Spotify/Apple Music).*

## 2. Tech Stack & Architecture
*   **Framework**: React, TypeScript, Vite
*   **UI/Styling**: Tailwind CSS, HeroUI (primitives), Lucide React (icons)
*   **Animations**: Motion (framer-motion)
*   **State & Routing**: Zustand (global player state), TanStack Router, TanStack Query
*   **Data/List**: TanStack Virtual (virtualisasi list besar), TanStack Table
*   **Forms**: React Hook Form + Zod

---

## 3. Core Layout Structure
Aplikasi dibagi menjadi empat area utama (pada Desktop):
1.  **Left Sidebar** (Navigasi Utama, 220–250px)
2.  **Main Content** (Library, Album Page, Artist Page, Search Results)
3.  **Right Context Panel** (Persisten; Contextual info: Lyrics, Queue, Details - ~320-380px)
4.  **Bottom Music Player** (Persisten selagi musik ada)

---

## 4. Progress Tracker 

### Phase 1 — MVP: P0 (Core Experience)
*Fokus Utama: Browse, Search, Play, Manage Queue, View Lyrics.*

- [ ] **App Shell & Layout Structure**
  - [x] Konfigurasi Tailwind CSS untuk *Dark Glass aesthetic* (Token Surface: #111111, Background: #0A0A0A)
  - [x] Komponen **Sidebar** (Home, Search, Library Nav, Responsive target: collapse on tablet/mobile)
  - [x] Komponen **Main Content Container** (Top nav minimal dengan Search bar & Profile)
  - [x] Komponen **Right Context Panel** (Kerangka awal selesai) (Toggle/Tabs: Lyrics, Queue, Details)
  - [x] Komponen **Bottom Music Player** persisten
- [ ] **Music Library Views**
  - [ ] **Home Page** (*Recently Played*, *Recently Added*, *Quick Access*)
  - [ ] **Album Page** (Artwork besar, Tracklist, Metadata detail)
  - [ ] **Artist Page** (Hero Image, Popular Tracks, Albums List)
  - [ ] Terapkan TanStack Virtual untuk merender banyak *track list* agar bebas latensi (Large Library target).
- [ ] **Search Engine (OpenSearch)**
  - [ ] Komponen UI *Search Results* minimal (terbagi di: Songs, Artists, Albums)
  - [ ] Integrasi backend Relevance-based / Typo-tolerant
- [ ] **Global Music Player (Bottom Bar)**
  - [ ] Playback controller (Play/Pause, Prev, Next, Seek Bar, Volume)
  - [ ] Audio Engine State/Context (Zustand store untuk presistensi antar route)
  - [ ] **Audio Badge Information** (Logo format, Codec, bit-depth/sample rate - ex: FLAC 24-bit/96kHz)
- [ ] **Context Panel: Player & Queue**
  - [ ] **Queue View**: Tampilan *Now Playing*, list *Up Next*
  - [ ] Fungsi hapus lagu dari queue, reorder (dasar), & play custom index.
  - [ ] **Details View**: Informasi detail Metadata (Genre, Release, Audio format detail)
- [ ] **Context Panel: Lyrics (LRCLIB)**
  - [ ] Tampilan lirik dengan *Timestamp sync*
  - [ ] Animasi translasi halus & Auto-scrolling
  - [ ] State penanganan *Lyrics Not Found*

### Phase 1 — MVP: P1 (Post-Core)
- [ ] **Playlist & Favorites**
  - [ ] Komponen tab `+ Add to Playlist` di bagian bawah dari Context Panel
  - [ ] Fungsi fitur hapus/tambah playlist (Create, Delete, Edit)
  - [ ] Fungsi *Favorite* (Track, Album, Artist)
- [ ] **Audio Quality Selector**
  - [ ] Popup klik dari badge FLAC bottom-bar (menampilkan setting kualitas `Lossless / High / Original`)
- [ ] **Extended Pages**
  - [ ] Halaman *Recently Played* lengkap (History)
  - [ ] Halaman *Recently Added* lengkap

### Phase 2 — Enhanced Experience
- [ ] Halaman **Fullscreen Now Playing** (beserta *Expanded Lyrics*)
- [ ] **Advanced Queue** (Drag & Drop, Insert `Play Next`, Save as Playlist)
- [ ] Dukungan tombol navigasi **Keyboard Shortcuts & Media Key** (OS level playback)
- [ ] Fitur **Advanced Library Navigasi** (Filter by Genre, Decade, Multi-select, Bulk Actions)
- [ ] Mode *Lyrics-only* / Manual lyrics offset adjustment

### Phase 3 — Audiwav Identity
- [ ] **Dynamic Artwork Environment**: Implementasi *Ambient Glow* di belakang player layar utama mengambil dominan warna artwork.
- [ ] **Advanced Audio UI**: Render Waveform, Audio spectrum analyzer.
- [ ] **Smart Library**: Sistem lagu sejenis (*Similar Tracks/Artists*), Rekomendasi pintar.
- [ ] Advanced visualizer & Smart equalizer.

### Phase 4 — Future / Optional
- [ ] PWA & Desktop native integration.
- [ ] Listening Statistics (Most Played, dsb).
- [ ] Theme Customization (Custom accent color selain standard).
- [ ] Offline Metadata Cache.

---

## 5. Folder Architecture (Feature-Sliced Design)
Aplikasi ini di-desain secara *domain-driven* menggunakan FSD pattern.
Struktur utama berada di folder `src/`:
- `app/`: Global providers, root component router, app configs.
- `assets/`: Static image, global font, CSS resources.
- `components/`: Pure UI components (`ui/`), Layouts element (`layout/`), Artwork component.
- `features/`: Logika tiap fungsi (slices) dipisah, masing-masing menyimpan store, hooks, form, typings & API fetch script-nya:
  - `search/`, `library/`, `player/`, `queue/`, `lyrics/`, `playlists/`, `audio/`.
- `pages/`: Component pages yang dirender oleh router.
- `stores/`: UI & non-feature bound global state.
- `lib/`: Utilities global (API SDK, helpers).

---

## 6. Kesiapan API Endpoint (API Readiness Status)

Berdasarkan analisis file *backend* (`apps/api`), berikut pemetaan titik kesiapan integrasi backend ke frontend (berdasarkan modul Features):

### ✅ Sudah Tersedia (MVP Ready)
- **`features/search` & `features/library`**
  - `GET /api/metadata/search` : Digunakan untuk pencarian lagu, artis, atau album (menyambung langsung ke parameter `q`, `limit`, `type`, `country`).
- **`features/library` & Details Panel**
  - `POST /api/metadata/detail` : Mengembalikan *enriched metadata* dari lagu/album tertentu untuk detail view.
- **`features/lyrics`**
  - `GET /api/lyrics/search` : Melakukan sinkronasi lirik sesuai `title`, `artist`, maupun durasi yang berjalan.
- **System / App-shell**
  - `GET /api/health` : Bisa dipanggil untuk deteksi Offline / Online dari sisi web.

### 🚧 Belum Tersedia / Perlu Dibangun di Backend (To-Do)
- **`features/player` (Core Playback Engine)**
  - Belum terlihat rute/API untuk *streaming/serve file audio fisiknya* (Mungkin endpoint semacam `/api/music/play/:id` atau serupa), *kecuali* file FLAC kamu layani menembus `static serve` langsung.
- **`features/playlists`**
  - Endpoint CRUD murni untuk Playlist (Create, Delete, Edit nama, Tambah/Hapus lagu) belum ada routenya di versi `/api` saat ini.
- **`features/library` (Favorites & History)**
  - Endpoint *Recently Played/Added* serta fungsionalitas penandaan *Favorited Items* belum tersedia.

