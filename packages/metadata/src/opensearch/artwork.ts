import postgres from "postgres";

let sqlClient: ReturnType<typeof postgres> | undefined;

export async function getCoverArtForRecording(recordingMbid: string): Promise<string | undefined> {
    const dbUrl = process.env.MUSICBRAINZ_DATABASE_URL;
    if (!dbUrl) return undefined;
    
    // Jangan bikin koneksi baru tiap lagu dipanggil (Bikin connection pool limit habis & hang)
    if (!sqlClient) {
        sqlClient = postgres(dbUrl, { max: 10, idle_timeout: 10 });
    }
    
    try {
        const rows = await sqlClient<{release_mbid: string}[]>`
            SELECT r.gid as release_mbid
            FROM recording rec
            JOIN track t ON t.recording = rec.id
            JOIN medium m ON t.medium = m.id
            JOIN release r ON m.release = r.id
            JOIN release_meta rm ON r.id = rm.id
            WHERE rec.gid = ${recordingMbid}
              AND rm.cover_art_presence = 'present'
            LIMIT 1;
        `;
        
        if (rows.length > 0 && rows[0] && rows[0].release_mbid) {
            return `https://coverartarchive.org/release/${rows[0].release_mbid}/front-500`;
        }
    } catch (e) {
        console.error("Cover Art Lookup Failed", e);
    }
    // Jangan sql.end() karena pool dipakai ramai-ramai secara global
    return undefined;
}
