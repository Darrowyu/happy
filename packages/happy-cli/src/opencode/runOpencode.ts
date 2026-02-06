/**
 * OpenCode Runner for Happy CLI
 * 
 * Main entry point for OpenCode integration.
 * Creates a Happy session, starts OpenCode web server, and syncs with mobile.
 */

import { randomUUID } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { ApiClient } from '@/api/api';
import { logger } from '@/ui/logger';
import { Credentials, readSettings } from '@/persistence';
import { initialMachineMetadata } from '@/daemon/run';
import { MessageQueue2 } from '@/utils/MessageQueue2';
import { hashObject } from '@/utils/deterministicJson';
import { notifyDaemonSessionStarted } from '@/daemon/controlClient';
import { registerKillSessionHandler } from '@/claude/registerKillSessionHandler';
import { stopCaffeinate } from '@/utils/caffeinate';
import { connectionState } from '@/utils/serverConnectionErrors';
import { startHappyServer } from '@/claude/utils/startHappyServer';
import { createSessionMetadata } from '@/utils/createSessionMetadata';
import { 
  startOpencodeServer, 
  stopOpencodeServer, 
  isOpencodeInstalled 
} from './opencodeLocal';

export interface OpencodeStartOptions {
  /** Starting mode: local or remote */
  startingMode?: 'local' | 'remote';

  /** Who started the session */
  startedBy?: 'daemon' | 'terminal';

  /** Model to use (provider/model format) */
  model?: string;

  /** Additional args to pass to opencode */
  opencodeArgs?: string[];

  /** Run in local mode without Happy Server connection */
  local?: boolean;
}

/**
 * Get all local IP addresses
 */
function getAllLocalIpAddresses(): { address: string; interface: string }[] {
  const nets = networkInterfaces();
  const addresses: { address: string; interface: string }[] = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal and non-IPv4 addresses
      if (!net.internal && net.family === 'IPv4') {
        addresses.push({ address: net.address, interface: name });
      }
    }
  }
  
  return addresses;
}

/**
 * Get primary local IP address (first non-internal IPv4)
 */
function getLocalIpAddress(): string {
  const addresses = getAllLocalIpAddresses();
  return addresses.length > 0 ? addresses[0].address : '127.0.0.1';
}

/**
 * Run OpenCode in local mode without Happy Server connection
 */
async function runLocalMode(options: OpencodeStartOptions): Promise<void> {
  const workingDirectory = process.cwd();
  const localIp = getLocalIpAddress();

  logger.debug(`[OPENCODE] ===== LOCAL MODE STARTING =====`);
  console.log('Starting OpenCode in local mode (no Happy Server connection)...');

  // Check if OpenCode is installed
  const installed = await isOpencodeInstalled();
  if (!installed) {
    console.error(`
OpenCode is not installed or not in PATH.

To install OpenCode:
  npm install -g opencode-ai

Note: The command is 'opencode' but the package name is 'opencode-ai'.

Or visit: https://opencode.ai/docs/installation
`);
    process.exit(1);
  }

  // Start OpenCode web server
  console.log('Starting OpenCode server...');
  let opencodeServer;
  try {
    opencodeServer = await startOpencodeServer({
      cwd: workingDirectory,
      port: 1874, // 固定端口为 1874
      hostname: '0.0.0.0', // 绑定到所有网络接口，支持局域网访问
      env: {
        ...(options.model ? { OPENCODE_MODEL: options.model } : {}),
      },
      args: options.opencodeArgs,
    });
  } catch (error) {
    console.error('Failed to start OpenCode server:', error);
    process.exit(1);
  }

  // Get all available network interfaces
  const allAddresses = getAllLocalIpAddresses();
  
  console.log(`OpenCode server running at http://localhost:${opencodeServer.port}`);
  console.log('');
  console.log('可用局域网地址 (Accessible via):');
  console.log('--------------------------------');
  
  if (allAddresses.length === 0) {
    console.log(`  http://${localIp}:${opencodeServer.port} (fallback)`);
  } else {
    allAddresses.forEach(({ address, interface: iface }) => {
      console.log(`  http://${address}:${opencodeServer.port} (${iface})`);
    });
  }
  
  console.log('');
  console.log('Press Ctrl+C to stop');

  // Keep process alive until user interrupts
  return new Promise((resolve) => {
    const handleSigInt = () => {
      console.log('\nStopping OpenCode server...');
      stopOpencodeServer().then(() => {
        logger.debug('[opencode] Local mode cleanup complete');
        resolve();
      });
    };

    process.on('SIGINT', handleSigInt);
    process.on('SIGTERM', handleSigInt);
  });
}

/**
 * Main entry point for OpenCode mode
 */
export async function runOpencode(
  credentials: Credentials,
  options: OpencodeStartOptions = {}
): Promise<void> {
  // Local mode: skip all Happy Server connections
  if (options.local) {
    await runLocalMode(options);
    return;
  }

  logger.debug(`[OPENCODE] ===== OPENCODE MODE STARTING =====`);

  const workingDirectory = process.cwd();
  const sessionTag = randomUUID();

  // Check if OpenCode is installed
  const installed = await isOpencodeInstalled();
  if (!installed) {
    console.error(`
OpenCode is not installed or not in PATH.

To install OpenCode:
  npm install -g opencode-ai

Note: The command is 'opencode' but the package name is 'opencode-ai'.

Or visit: https://opencode.ai/docs/installation
`);
    process.exit(1);
  }

  // Set backend for offline warnings
  connectionState.setBackend('OpenCode');

  // Create API client
  const api = await ApiClient.create(credentials);

  // Get machine ID
  const settings = await readSettings();
  const machineId = settings?.machineId;
  if (!machineId) {
    console.error(`[START] No machine ID found in settings. Please run "happy auth login" first.`);
    process.exit(1);
  }

  logger.debug(`Using machineId: ${machineId}`);

  // Create machine if doesn't exist
  await api.getOrCreateMachine({
    machineId,
    metadata: initialMachineMetadata,
  });

  // Create session metadata
  const { state, metadata } = createSessionMetadata({
    flavor: 'opencode',
    machineId,
    startedBy: options.startedBy,
  });

  // Create session
  const response = await api.getOrCreateSession({
    tag: sessionTag,
    metadata,
    state,
  });

  if (!response) {
    console.error('Failed to create session. Server may be unreachable.');
    process.exit(1);
  }

  logger.debug(`Session created: ${response.id}`);

  // Notify daemon
  try {
    await notifyDaemonSessionStarted(response.id, metadata);
  } catch (error) {
    logger.debug('[START] Failed to report to daemon:', error);
  }

  // Create session client
  const session = api.sessionSyncClient(response);

  // Start Happy MCP server
  const happyServer = await startHappyServer(session);
  logger.debug(`[START] Happy MCP server started at ${happyServer.url}`);

  // Start OpenCode web server
  console.log('Starting OpenCode server...');
  let opencodeServer;
  try {
    opencodeServer = await startOpencodeServer({
      cwd: workingDirectory,
      port: 0, // Let OS assign port
      hostname: '127.0.0.1',
      env: options.model ? { OPENCODE_MODEL: options.model } : undefined,
      args: options.opencodeArgs,
    });
  } catch (error) {
    console.error('Failed to start OpenCode server:', error);
    process.exit(1);
  }

  console.log(`OpenCode server running at ${opencodeServer.url}`);

  // Create message queue for user messages
  interface OpencodeMode {
    model?: string;
  }

  const messageQueue = new MessageQueue2<OpencodeMode>((mode) =>
    hashObject({ model: mode.model })
  );

  // Track current settings
  let currentModel = options.model;

  // Handle messages from mobile/Web
  session.onUserMessage((message) => {
    // Update model if specified in message
    if (message.meta?.model) {
      currentModel = message.meta.model;
    }

    const mode: OpencodeMode = {
      model: currentModel,
    };

    messageQueue.push(message.content.text, mode);
    logger.debugLargeJson('User message pushed to queue:', message);
  });

  // Poll OpenCode server for messages/output
  // Note: In a full implementation, you'd use WebSocket or SSE
  // For now, we'll use a simple polling approach
  let shouldExit = false;
  let abortController = new AbortController();

  // Register kill session handler
  const handleKillSession = async () => {
    logger.debug('[opencode] Kill session requested');
    shouldExit = true;
    abortController.abort();
  };

  registerKillSessionHandler(session.rpcHandlerManager, handleKillSession);

  // Send ready event
  session.sendSessionEvent({ type: 'ready' });

  // Main loop - process messages from queue
  try {
    while (!shouldExit) {
      const message = await messageQueue.waitForMessagesAndGetAsString(
        abortController.signal
      );

      if (!message || shouldExit) break;

      // Send message to OpenCode via HTTP API
      try {
        const response = await fetch(`${opencodeServer.url}/api/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.message,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Send confirmation back to mobile
        session.sendSessionEvent({
          type: 'message',
          message: `Sent: ${message.message}`,
        });

      } catch (error) {
        logger.debug('[opencode] Error sending message:', error);
        session.sendSessionEvent({
          type: 'message',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
  } finally {
    // Cleanup
    logger.debug('[opencode] Cleaning up...');

    // Update lifecycle state
    session.updateMetadata((currentMetadata) => ({
      ...currentMetadata,
      lifecycleState: 'archived',
      lifecycleStateSince: Date.now(),
      archivedBy: 'cli',
      archiveReason: 'Session ended',
    }));

    // Send session death
    session.sendSessionDeath();
    await session.flush();
    await session.close();

    // Stop OpenCode server
    await stopOpencodeServer();

    // Stop Happy MCP server
    happyServer.stop();

    // Stop caffeinate
    stopCaffeinate();

    logger.debug('[opencode] Cleanup complete');
  }
}
