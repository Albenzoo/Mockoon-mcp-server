import { getDefaultMockoonDir, getExtraDataDirs } from "../mockoon/fileManager.js";

/**
 * Directories where Mockoon environment files are stored.
 * Uses MOCKOON_STORAGE_DIR env var as primary, falling back to the default Mockoon dir.
 * Additional directories can be added via MOCKOON_DATA_DIRS.
 */
export const STORAGE_DIRS: string[] = [
    process.env.MOCKOON_STORAGE_DIR ?? getDefaultMockoonDir(),
    ...getExtraDataDirs(),
];

/**
 * Generates a RFC-4122 v4 UUID using Math.random().
 */
export function uuidv4(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

/**
 * Generates a short 6-character uppercase alphanumeric ID,
 * used as the internal `id` field in Mockoon DataBucket objects.
 */
export function shortId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
