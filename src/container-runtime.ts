/**
 * Container runtime abstraction for NanoClaw.
 * All runtime-specific logic lives here so swapping runtimes means changing one file.
 *
 * Runtime: Apple Containers (macOS) — `container` CLI via brew.
 * Containers are lightweight VMs using vmnet. The host is reachable via bridge100 gateway.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

import { logger } from './logger.js';

/** The container runtime binary name. */
export const CONTAINER_RUNTIME_BIN = 'container';

/**
 * IP address containers use to reach the host machine.
 * Apple Containers uses vmnet bridging — the host is at bridge100's IPv4 address.
 * Falls back to 192.168.64.1 (vmnet default) if interface detection fails.
 */
export const CONTAINER_HOST_GATEWAY = detectHostGateway();

function detectHostGateway(): string {
  // Allow override via env var
  if (process.env.CONTAINER_HOST_GATEWAY) return process.env.CONTAINER_HOST_GATEWAY;

  if (os.platform() === 'darwin') {
    // Apple Containers: detect bridge100 IPv4 address
    const ifaces = os.networkInterfaces();
    const bridge = ifaces['bridge100'];
    if (bridge) {
      const ipv4 = bridge.find((a) => a.family === 'IPv4');
      if (ipv4) return ipv4.address;
    }
    // vmnet default when bridge100 isn't up yet (created on first container run)
    return '192.168.64.1';
  }

  // Linux: Docker's host.docker.internal via --add-host
  return 'host.docker.internal';
}

/**
 * Address the credential proxy binds to.
 * Apple Containers (macOS): bind to bridge100 IP so containers can reach it via vmnet.
 * Linux: bind to docker0 bridge IP.
 */
export const PROXY_BIND_HOST =
  process.env.CREDENTIAL_PROXY_HOST || detectProxyBindHost();

function detectProxyBindHost(): string {
  if (os.platform() === 'darwin') {
    // Apple Containers: proxy must be reachable from the VM via bridge100
    // Binding to the bridge IP allows container → host communication
    const ifaces = os.networkInterfaces();
    const bridge = ifaces['bridge100'];
    if (bridge) {
      const ipv4 = bridge.find((a) => a.family === 'IPv4');
      if (ipv4) return ipv4.address;
    }
    // Fallback: 0.0.0.0 binds all interfaces (works but less secure)
    return '0.0.0.0';
  }

  // WSL uses Docker Desktop (same VM routing as macOS) — loopback is correct.
  if (fs.existsSync('/proc/sys/fs/binfmt_misc/WSLInterop')) return '127.0.0.1';

  // Bare-metal Linux: bind to the docker0 bridge IP
  const ifaces = os.networkInterfaces();
  const docker0 = ifaces['docker0'];
  if (docker0) {
    const ipv4 = docker0.find((a) => a.family === 'IPv4');
    if (ipv4) return ipv4.address;
  }
  return '0.0.0.0';
}

/** CLI args needed for the container to resolve the host gateway. */
export function hostGatewayArgs(): string[] {
  // Apple Containers: no --add-host flag; containers reach host via bridge100 IP
  // Linux (Docker): host.docker.internal isn't built-in — add it explicitly
  if (os.platform() === 'linux') {
    return ['--add-host=host.docker.internal:host-gateway'];
  }
  return [];
}

/** Returns CLI args for a readonly bind mount. */
export function readonlyMountArgs(
  hostPath: string,
  containerPath: string,
): string[] {
  return ['-v', `${hostPath}:${containerPath}:ro`];
}

/** Returns the shell command to stop a container by name. */
export function stopContainer(name: string): string {
  return `${CONTAINER_RUNTIME_BIN} stop ${name}`;
}

/** Ensure the container runtime is running, starting it if needed. */
export function ensureContainerRuntimeRunning(): void {
  try {
    execSync(`${CONTAINER_RUNTIME_BIN} system status`, {
      stdio: 'pipe',
      timeout: 10000,
    });
    logger.debug('Container runtime already running');
  } catch (err) {
    // Try starting the runtime
    try {
      execSync(`brew services start ${CONTAINER_RUNTIME_BIN}`, {
        stdio: 'pipe',
        timeout: 30000,
      });
      logger.info('Started container runtime via brew services');
      return;
    } catch (brewErr) {
      logger.warn({ brewErr }, 'brew services start container also failed');
    }

    logger.error({ err }, 'Failed to reach container runtime');
    console.error(
      '\n╔════════════════════════════════════════════════════════════════╗',
    );
    console.error(
      '║  FATAL: Container runtime failed to start                      ║',
    );
    console.error(
      '║                                                                ║',
    );
    console.error(
      '║  Agents cannot run without a container runtime. To fix:        ║',
    );
    console.error(
      '║  1. brew install container                                      ║',
    );
    console.error(
      '║  2. container system kernel set --recommended                   ║',
    );
    console.error(
      '║  3. brew services start container                               ║',
    );
    console.error(
      '╚════════════════════════════════════════════════════════════════╝\n',
    );
    throw new Error('Container runtime is required but failed to start');
  }
}

/** Kill orphaned NanoClaw containers from previous runs. */
export function cleanupOrphans(): void {
  try {
    // Apple Containers: no --filter flag, use --format json and filter in JS
    const output = execSync(
      `${CONTAINER_RUNTIME_BIN} ls -a --format json`,
      { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' },
    );
    if (!output.trim()) return;

    let containers: Array<{ id: string; names?: string; name?: string }>;
    try {
      containers = JSON.parse(output);
    } catch (jsonErr) {
      logger.debug({ jsonErr }, 'container ls JSON parse failed, trying line-by-line');
      containers = output.trim().split('\n').map((l) => JSON.parse(l));
    }

    const orphans = containers
      .map((c) => c.names || c.name || c.id)
      .filter((name) => name.startsWith('nanoclaw-'));

    for (const name of orphans) {
      try {
        execSync(stopContainer(name), { stdio: 'pipe' });
      } catch (err) {
        logger.debug({ name, err }, 'Failed to stop orphaned container');
      }
    }
    if (orphans.length > 0) {
      logger.info(
        { count: orphans.length, names: orphans },
        'Stopped orphaned containers',
      );
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to clean up orphaned containers');
  }
}
