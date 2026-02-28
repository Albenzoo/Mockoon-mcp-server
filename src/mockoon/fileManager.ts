import fs from "fs";
import path from "path";
import { Environment } from "@mockoon/commons";

/**
 * Returns the default directory where Mockoon stores environment files.
 * Windows: %APPDATA%\mockoon\storage
 * Linux/macOS: ~/.config/mockoon/storage
 */
export function getDefaultMockoonDir(): string {
  const appData = process.env.APPDATA ?? path.join(process.env.HOME ?? "", ".config");
  return path.join(appData, "mockoon", "storage");
}

/** Returns a summary of all environments found in the given storage directory */
export function listEnvironments(storageDir: string): Array<{ id: string; name: string; port: number; filePath: string }> {
  if (!fs.existsSync(storageDir)) return [];

  return fs
    .readdirSync(storageDir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const filePath = path.join(storageDir, file);
      try {
        const env: Environment = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        return { id: env.uuid, name: env.name, port: env.port, filePath };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ id: string; name: string; port: number; filePath: string }>;
}

/** Reads and parses a single Mockoon environment from a JSON file */
export function readEnvironment(filePath: string): Environment {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Environment;
}

/** Writes (creates or overwrites) a Mockoon environment JSON file */
export function writeEnvironment(filePath: string, env: Environment): void {
  fs.writeFileSync(filePath, JSON.stringify(env, null, 2), "utf-8");
}

/** Finds the file path of an environment by its UUID, or returns null if not found */
export function findEnvironmentFile(storageDir: string, uuid: string): string | null {
  const envs = listEnvironments(storageDir);
  return envs.find((e) => e.id === uuid)?.filePath ?? null;
}
