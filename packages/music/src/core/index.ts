export * from "./types";
export * from "./finder";

// Mendaftarkan definisi hasil search dari slskd
export interface SlskdSearchResponse {
  id: string;
  state: string;
}

export interface SlskdSearchStateResponse {
  id: string;
  state: string;
  isComplete: boolean;
  fileCount: number;
  responses: Array<{
    username: string;
    files: Array<{
      filename: string;
      size: number;
      extension: string;
      bitRate: number;
    }>;
  }>;
}
