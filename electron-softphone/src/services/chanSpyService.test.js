/**
 * ChanSpy Service Unit Tests for Electron Softphone
 * Comprehensive tests for ChanSpy service functionality
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock fetch globally
global.fetch = jest.fn();

// Mock storageService
jest.mock('./storageService', () => ({
  storageService: {
    getAuthToken: jest.fn(() => 'mock-token'),
    getExtension: jest.fn(() => '1000'),
  },
}));

// Mock serverConfig
jest.mock('../config/serverConfig', () => ({
  __esModule: true,
  default: {
    apiUrl: 'http://localhost:8004',
  },
}));

// Import after mocks
import { chanSpyService } from './chanSpyService';

describe('ChanSpy Service - Electron Softphone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockReset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('MODES constant', () => {
    it('should have LISTEN mode', () => {
      expect(chanSpyService.MODES.LISTEN).toBe('listen');
    });

    it('should have WHISPER mode', () => {
      expect(chanSpyService.MODES.WHISPER).toBe('whisper');
    });

    it('should have BARGE mode', () => {
      expect(chanSpyService.MODES.BARGE).toBe('barge');
    });
  });

  describe('getSpyableChannels', () => {
    it('should fetch spyable channels successfully', async () => {
      const mockChannels = [
        { channel: 'PJSIP/1001-00000001', extension: '1001' },
        { channel: 'PJSIP/1002-00000002', extension: '1002' },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockChannels }),
      });

      const result = await chanSpyService.getSpyableChannels();

      expect(result).toEqual(mockChannels);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8004/api/ami/chanspy/channels',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should return empty array when no channels', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      const result = await chanSpyService.getSpyableChannels();

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ success: false, message: 'Server error' }),
      });

      await expect(chanSpyService.getSpyableChannels()).rejects.toThrow();
    });
  });

  describe('startChanSpy', () => {
    it('should start spy with correct parameters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { mode: 'listen', spyerExtension: '1000', targetChannel: 'PJSIP/1001-00000001' },
        }),
      });

      const result = await chanSpyService.startChanSpy('1000', 'PJSIP/1001-00000001', {
        mode: 'listen',
        quiet: true,
        volume: 0,
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8004/api/ami/chanspy/start',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"spyerExtension":"1000"'),
        })
      );
    });

    it('should default to listen mode', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await chanSpyService.startChanSpy('1000', 'PJSIP/1001-00000001', {});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mode":"listen"'),
        })
      );
    });

    it('should include whisper mode when specified', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await chanSpyService.startChanSpy('1000', 'PJSIP/1001-00000001', { mode: 'whisper' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mode":"whisper"'),
        })
      );
    });

    it('should include barge mode when specified', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await chanSpyService.startChanSpy('1000', 'PJSIP/1001-00000001', { mode: 'barge' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mode":"barge"'),
        })
      );
    });

    it('should include volume when specified', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await chanSpyService.startChanSpy('1000', 'PJSIP/1001-00000001', { volume: 2 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"volume":2'),
        })
      );
    });

    it('should handle API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ success: false, message: 'Missing parameters' }),
      });

      await expect(
        chanSpyService.startChanSpy('1000', 'PJSIP/1001-00000001', {})
      ).rejects.toThrow('Missing parameters');
    });
  });

  describe('startChanSpyByExtension', () => {
    it('should start spy by extension with correct parameters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { mode: 'listen', spyerExtension: '1000', targetExtension: '1001' },
        }),
      });

      const result = await chanSpyService.startChanSpyByExtension('1000', '1001', {
        mode: 'listen',
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8004/api/ami/chanspy/start-by-extension',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"targetExtension":"1001"'),
        })
      );
    });

    it('should handle no active channel error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({
          success: false,
          message: 'No active channel found for extension 1001',
        }),
      });

      await expect(
        chanSpyService.startChanSpyByExtension('1000', '1001', {})
      ).rejects.toThrow('No active channel found for extension 1001');
    });
  });

  describe('stopChanSpy', () => {
    it('should stop spy session successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'ChanSpy stopped' }),
      });

      const result = await chanSpyService.stopChanSpy('1000');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8004/api/ami/chanspy/stop',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"spyerExtension":"1000"'),
        })
      );
    });

    it('should handle stop error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({
          success: false,
          message: 'No active spy session found',
        }),
      });

      await expect(chanSpyService.stopChanSpy('1000')).rejects.toThrow(
        'No active spy session found'
      );
    });
  });

  describe('switchMode', () => {
    it('should switch mode successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Mode switching requires restart',
        }),
      });

      const result = await chanSpyService.switchMode('1000', 'whisper');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8004/api/ami/chanspy/switch-mode',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"mode":"whisper"'),
        })
      );
    });
  });

  describe('getModeInfo', () => {
    it('should return correct info for listen mode', () => {
      const info = chanSpyService.getModeInfo('listen');

      expect(info.label).toBe('Silent Monitor');
      expect(info.description).toContain('without being heard');
      expect(info.icon).toBe('Headphones');
      expect(info.color).toBe('info');
    });

    it('should return correct info for whisper mode', () => {
      const info = chanSpyService.getModeInfo('whisper');

      expect(info.label).toBe('Whisper');
      expect(info.description).toContain('agent only');
      expect(info.icon).toBe('RecordVoiceOver');
      expect(info.color).toBe('warning');
    });

    it('should return correct info for barge mode', () => {
      const info = chanSpyService.getModeInfo('barge');

      expect(info.label).toBe('Barge In');
      expect(info.description).toContain('both parties');
      expect(info.icon).toBe('Phone');
      expect(info.color).toBe('error');
    });

    it('should return listen mode info for unknown mode', () => {
      const info = chanSpyService.getModeInfo('invalid');

      expect(info.label).toBe('Silent Monitor');
    });

    it('should return listen mode info for null', () => {
      const info = chanSpyService.getModeInfo(null);

      expect(info.label).toBe('Silent Monitor');
    });

    it('should return listen mode info for undefined', () => {
      const info = chanSpyService.getModeInfo(undefined);

      expect(info.label).toBe('Silent Monitor');
    });
  });
});

describe('API Request Format', () => {
  beforeEach(() => {
    global.fetch.mockReset();
  });

  it('should include Authorization header', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    await chanSpyService.getSpyableChannels();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /),
        }),
      })
    );
  });

  it('should include Content-Type header', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    await chanSpyService.getSpyableChannels();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should send JSON body for POST requests', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await chanSpyService.startChanSpy('1000', 'PJSIP/1001-00000001', {});

    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(() => JSON.parse(options.body)).not.toThrow();
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    global.fetch.mockReset();
  });

  it('should handle network errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(chanSpyService.getSpyableChannels()).rejects.toThrow('Network error');
  });

  it('should handle JSON parse errors', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    // Should handle gracefully
    await expect(chanSpyService.getSpyableChannels()).rejects.toThrow();
  });

  it('should extract error message from response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve({
        success: false,
        message: 'Custom error message',
      }),
    });

    await expect(chanSpyService.startChanSpy('1000', 'PJSIP/1001', {}))
      .rejects.toThrow('Custom error message');
  });

  it('should use statusText when no message in response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
    });

    await expect(chanSpyService.startChanSpy('1000', 'PJSIP/1001', {}))
      .rejects.toThrow();
  });
});
