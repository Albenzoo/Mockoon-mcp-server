import { spawn, ChildProcess } from "child_process";

const runningServers = new Map<string, ChildProcess>();

/** Starts a Mockoon environment as a local mock server using mockoon-cli */
export function startServer(environmentId: string, filePath: string, port?: number): string {
  if (runningServers.has(environmentId)) {
    return `Server for environment '${environmentId}' is already running.`;
  }

  const args = ["start", "--data", filePath];
  if (port) args.push("--port", String(port));

  const proc = spawn("mockoon-cli", args, { stdio: "pipe", shell: true });
  runningServers.set(environmentId, proc);

  proc.on("exit", () => runningServers.delete(environmentId));

  return `Server started for environment '${environmentId}'${port ? ` on port ${port}` : ""}.`;
}

/** Stops a running Mockoon mock server */
export function stopServer(environmentId: string): string {
  const proc = runningServers.get(environmentId);
  if (!proc) {
    return `No running server found for environment '${environmentId}'.`;
  }

  proc.kill();
  runningServers.delete(environmentId);
  return `Server for environment '${environmentId}' stopped.`;
}

/** Returns the list of environment IDs currently running as mock servers */
export function listRunningServers(): string[] {
  return Array.from(runningServers.keys());
}
