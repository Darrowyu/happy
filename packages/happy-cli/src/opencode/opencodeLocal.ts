/**
 * OpenCode Local Process Manager
 * 
 * Spawns and manages OpenCode CLI in web server mode for Happy integration.
 * OpenCode web mode provides HTTP API and WebSocket for real-time communication.
 */

import { spawn, ChildProcess } from 'node:child_process';
import { logger } from '@/ui/logger';
import { OpencodeProcessOptions, OpencodeServerStatus } from './types';

let opencodeProcess: ChildProcess | null = null;
let serverStatus: OpencodeServerStatus | null = null;

/**
 * Find OpenCode CLI executable
 */
export function findOpencodeCli(): string {
  // Check if opencode is in PATH
  return 'opencode'; // Assume it's in PATH since user has it installed
}

/**
 * Start OpenCode in web server mode
 */
export async function startOpencodeServer(
  options: OpencodeProcessOptions
): Promise<OpencodeServerStatus> {
  const opencodePath = findOpencodeCli();
  const port = options.port || 0; // 0 = let OS assign port
  const hostname = options.hostname || '127.0.0.1';
  
  // Build command arguments
  const args = ['web', '--hostname', hostname];
  
  if (port > 0) {
    args.push('--port', port.toString());
  }
  
  // Add model if specified
  if (options.env?.OPENCODE_MODEL) {
    args.push('--model', options.env.OPENCODE_MODEL);
  }
  
  // Add any additional args
  if (options.args) {
    args.push(...options.args);
  }
  
  logger.debug(`[opencode] Starting server: ${opencodePath} ${args.join(' ')}`);
  
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ...options.env,
    };
    
    opencodeProcess = spawn(opencodePath, args, {
      cwd: options.cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    let resolved = false;
    
    // Handle stdout - look for "Listening on" message
    opencodeProcess.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      logger.debug(`[opencode stdout] ${chunk}`);
      
      // Parse port from output
      // OpenCode typically outputs: "Listening on http://127.0.0.1:PORT"
      const match = chunk.match(/Listening on (http:\/\/[^:]+:(\d+))/);
      if (match && !resolved) {
        resolved = true;
        const url = match[1];
        const actualPort = parseInt(match[2], 10);
        
        serverStatus = {
          url,
          port: actualPort,
          ready: true,
        };
        
        logger.debug(`[opencode] Server ready at ${url}`);
        resolve(serverStatus);
      }
    });
    
    // Handle stderr
    opencodeProcess.stderr?.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      logger.debug(`[opencode stderr] ${chunk}`);
    });
    
    // Handle process exit
    opencodeProcess.on('exit', (code) => {
      logger.debug(`[opencode] Process exited with code ${code}`);
      opencodeProcess = null;
      serverStatus = null;
      
      if (!resolved) {
        reject(new Error(`OpenCode process exited with code ${code}. stderr: ${stderr}`));
      }
    });
    
    // Handle errors
    opencodeProcess.on('error', (error) => {
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
    const proc = spawn('opencode', ['--version'], {
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
