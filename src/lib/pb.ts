import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_PB_URL);

// Parallel requests to the same collection are intentional (e.g. quick successive edits).
pb.autoCancellation(false);
