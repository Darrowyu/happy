import { describe, it, expect } from 'vitest';
import type { 
  OpencodeSessionConfig, 
  OpencodeProcessOptions, 
  OpencodeMessage,
  OpencodeServerStatus 
} from './types';

describe('opencode types', () => {
  describe('OpencodeSessionConfig', () => {
    it('should accept valid session config', () => {
      const config: OpencodeSessionConfig = {
        prompt: 'Hello world',
        cwd: '/tmp',
        port: 8080,
        hostname: 'localhost',
        model: 'anthropic/claude-3-5-sonnet',
        agent: 'default',
        sessionId: 'test-session',
        continue: false,
      };
      
      expect(config.prompt).toBe('Hello world');
      expect(config.port).toBe(8080);
      expect(config.model).toBe('anthropic/claude-3-5-sonnet');
    });

    it('should work with minimal config', () => {
      const config: OpencodeSessionConfig = {};
      expect(config).toBeDefined();
    });
  });

  describe('OpencodeProcessOptions', () => {
    it('should accept valid process options', () => {
      const options: OpencodeProcessOptions = {
        cwd: '/tmp',
        port: 8080,
        hostname: '127.0.0.1',
        env: { OPENCODE_MODEL: 'test-model' },
        args: ['--verbose'],
      };
      
      expect(options.cwd).toBe('/tmp');
      expect(options.env?.OPENCODE_MODEL).toBe('test-model');
    });

    it('should require cwd', () => {
      // TypeScript would enforce this at compile time
      const options: OpencodeProcessOptions = {
        cwd: '/test',
      };
      expect(options.cwd).toBe('/test');
    });
  });

  describe('OpencodeMessage', () => {
    it('should accept message type', () => {
      const message: OpencodeMessage = {
        type: 'message',
        id: 'msg-1',
        message: 'Test message',
      };
      
      expect(message.type).toBe('message');
      expect(message.id).toBe('msg-1');
    });

    it('should accept tool-call type', () => {
      const message: OpencodeMessage = {
        type: 'tool-call',
        id: 'tool-1',
        callId: 'call-123',
        name: 'test-tool',
        input: { arg: 'value' },
      };
      
      expect(message.type).toBe('tool-call');
      expect(message.name).toBe('test-tool');
    });

    it('should accept error type', () => {
      const message: OpencodeMessage = {
        type: 'error',
        id: 'err-1',
        error: 'Something went wrong',
      };
      
      expect(message.type).toBe('error');
      expect(message.error).toBe('Something went wrong');
    });
  });

  describe('OpencodeServerStatus', () => {
    it('should have required fields', () => {
      const status: OpencodeServerStatus = {
        url: 'http://127.0.0.1:8080',
        port: 8080,
        ready: true,
      };
      
      expect(status.url).toBe('http://127.0.0.1:8080');
      expect(status.port).toBe(8080);
      expect(status.ready).toBe(true);
    });

    it('should have optional sessionId', () => {
      const status: OpencodeServerStatus = {
        url: 'http://127.0.0.1:8080',
        port: 8080,
        sessionId: 'sess-123',
        ready: true,
      };
      
      expect(status.sessionId).toBe('sess-123');
    });
  });
});
