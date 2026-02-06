import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  findOpencodeCli, 
  isOpencodeInstalled, 
  getOpencodeServerStatus 
} from './opencodeLocal';

describe('opencodeLocal', () => {
  describe('findOpencodeCli', () => {
    it('should return "opencode" as the CLI command', () => {
      const result = findOpencodeCli();
      expect(result).toBe('opencode');
    });
  });

  describe('getOpencodeServerStatus', () => {
    it('should return null when server is not running', () => {
      const status = getOpencodeServerStatus();
      expect(status).toBeNull();
    });
  });

  describe('isOpencodeInstalled', () => {
    it('should check if opencode is installed', async () => {
      // This test depends on the environment
      // In CI or test environments, it may return false
      const result = await isOpencodeInstalled();
      // Just verify it returns a boolean
      expect(typeof result).toBe('boolean');
    }, 10000); // Increase timeout for spawn operation
  });
});
