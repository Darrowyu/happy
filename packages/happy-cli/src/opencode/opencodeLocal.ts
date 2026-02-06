/**
 * OpenCode Local Process Manager
 *
 * Spawns and manages OpenCode CLI in web server mode for Happy integration.
 * OpenCode web mode provides HTTP API and WebSocket for real-time communication.
 */

import { spawn, ChildProcess } from 'node:child_process';
import { logger } from '@/ui/logger';
import { OpencodeProcessOptions, OpencodeServerStatus } from './types';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

let opencodeProcess: ChildProcess | null = null;
let serverStatus: OpencodeServerStatus | null = null;

interface OpencodeCliInfo {
  command: string;
  args: string[];
}

/**
 * Find OpenCode CLI executable
 * Returns the path to the opencode JS file for direct node execution
 */
export function findOpencodeCli(): OpencodeCliInfo {
  // On Windows, prefer direct node execution of the JS file
  // This avoids .cmd wrapper issues with argument passing
  const jsPath = join(homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', 'opencode-ai', 'bin', 'opencode');

  if (existsSync(jsPath)) {
    logger.debug(`[opencode] Found OpenCode JS at: ${jsPath}`);
    return { command: 'node', args: [jsPath] };
  }

  // Fallback to command in PATH
  logger.debug(`[opencode] Using PATH opencode command`);
  return { command: 'opencode', args: [] };
}

/**
 * Start OpenCode in web server mode
 */
export async function startOpencodeServer(
  options: OpencodeProcessOptions
): Promise<OpencodeServerStatus> {
  const cliInfo = findOpencodeCli();
  const port = options.port || 0; // 0 = let OS assign port
  const hostname = options.hostname || '0.0.0.0'; // 默认绑定所有网络接口，支持局域网访问

  // Build command arguments
  const webArgs = ['web', '--hostname', hostname];

  if (port > 0) {
    webArgs.push('--port', port.toString());
  }

  // Add model if specified
  if (options.env?.OPENCODE_MODEL) {
    webArgs.push('--model', options.env.OPENCODE_MODEL);
  }

  // Add any additional args
  if (options.args) {
    webArgs.push(...options.args);
  }

  // Combine base args with web args
  const allArgs = [...cliInfo.args, ...webArgs];

  logger.debug(`[opencode] Starting server: ${cliInfo.command} ${allArgs.join(' ')}`);

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ...options.env,
    };

    opencodeProcess = spawn(cliInfo.command, allArgs, {
      cwd: options.cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    // Track server URL once we find it
    let detectedUrl: string | null = null;
    let detectedPort: number | null = null;

    // Helper function to strip ANSI escape codes
    const stripAnsi = (str: string): string => {
      return str.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
    };

    // Helper function to check for server ready
    const checkForServerReady = (data: Buffer) => {
      const chunk = data.toString();
      const cleanChunk = stripAnsi(chunk);
      logger.debug(`[opencode output] ${cleanChunk}`);

      // Parse port from output
      // OpenCode outputs: "Local access: http://localhost:PORT" and "Network access: http://IP:PORT"
      // Prefer Network access for LAN availability
      const networkMatch = cleanChunk.match(/Network access:\s+(http:\/\/[^:]+:(\d+))\/?/);
      const localMatch = cleanChunk.match(/Local access:\s+(http:\/\/[^:]+:(\d+))\/?/);

      const match = networkMatch || localMatch;

      if (match && !resolved) {
        resolved = true;
        detectedUrl = match[1];
        detectedPort = parseInt(match[2], 10);

        serverStatus = {
          url: detectedUrl,
          port: detectedPort,
          ready: true,
        };

        logger.debug(`[opencode] Server ready at ${detectedUrl}`);
        resolve(serverStatus);
      }
    };

    // Handle stdout - look for server URL message
    opencodeProcess!.stdout?.on('data', (data) => {
      stdout += data.toString();
      checkForServerReady(data);
    });

    // Handle stderr - OpenCode outputs to stderr
    opencodeProcess!.stderr?.on('data', (data) => {
      stderr += data.toString();
      checkForServerReady(data);
    });

    // Handle process exit
    opencodeProcess!.on('exit', (code) => {
      logger.debug(`[opencode] Process exited with code ${code}`);
      opencodeProcess = null;
      serverStatus = null;

      if (!resolved) {
        reject(new Error(`OpenCode process exited with code ${code}. stderr: ${stderr}`));
      }
    });

    // Handle errors
    opencodeProcess!.on('error', (error) => {
      logger.debug(`[opencode] Process error:`, error);
      if (!resolved) {
        reject(error);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        opencodeProcess?.kill();
        reject(new Error('Timeout waiting for OpenCode server to start'));
      }
    }, 30000);
  });
}

/**
 * Stop the OpenCode server
 */
export async function stopOpencodeServer(): Promise<void> {
  if (!opencodeProcess) {
    logger.debug('[opencode] No server running');
    return;
  }

  logger.debug('[opencode] Stopping server...');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logger.debug('[opencode] Force killing server');
      opencodeProcess?.kill('SIGKILL');
      resolve();
    }, 5000);

    opencodeProcess?.on('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    opencodeProcess?.kill('SIGTERM');
  });
}

/**
 * Get current server status
 */
export function getOpencodeServerStatus(): OpencodeServerStatus | null {
  return serverStatus;
}

/**
 * Check if OpenCode is installed
 */
export async function isOpencodeInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const cliInfo = findOpencodeCli();
    const checkArgs = [...cliInfo.args, '--version'];
    const proc = spawn(cliInfo.command, checkArgs, {
      stdio: 'ignore',
    });

    proc.on('exit', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      proc.kill();
      resolve(false);
    }, 5000);
  });
}
