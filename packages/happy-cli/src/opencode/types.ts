/**
 * OpenCode-specific types for Happy CLI integration
 */

export interface OpencodeSessionConfig {
  /** Initial prompt to start the session */
  prompt?: string;
  
  /** Working directory for the session */
  cwd?: string;
  
  /** Port for OpenCode web server */
  port?: number;
  
  /** Hostname for OpenCode web server */
  hostname?: string;
  
  /** Model to use (provider/model format) */
  model?: string;
  
  /** Agent configuration name */
  agent?: string;
  
  /** Session ID to continue */
  sessionId?: string;
  
  /** Whether to continue last session */
  continue?: boolean;
}

export interface OpencodeProcessOptions {
  /** Working directory */
  cwd: string;
  
  /** Environment variables */
  env?: Record<string, string>;
  
  /** Port for web server */
  port?: number;
  
  /** Hostname for web server */
  hostname?: string;
  
  /** Additional arguments to pass to opencode */
  args?: string[];
}

export interface OpencodeMessage {
  type: 'message' | 'tool-call' | 'tool-call-result' | 'thinking' | 'error';
  id: string;
  content?: string;
  message?: string;
  callId?: string;
  name?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface OpencodeServerStatus {
  url: string;
  port: number;
  sessionId?: string;
  ready: boolean;
}
