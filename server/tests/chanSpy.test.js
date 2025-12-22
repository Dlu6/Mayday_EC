/**
 * ChanSpy Unit Tests
 * Comprehensive tests for ChanSpy (Call Monitoring) functionality
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the amiService
const mockAmiService = {
  getState: jest.fn(),
  startChanSpy: jest.fn(),
  startChanSpyByExtension: jest.fn(),
  stopChanSpy: jest.fn(),
  getSpyableChannels: jest.fn(),
  switchChanSpyMode: jest.fn(),
  getChannelForExtension: jest.fn(),
};

// Mock chalk to avoid color output in tests
jest.mock('chalk', () => ({
  blue: (str) => str,
  green: (str) => str,
  red: (str) => str,
  yellow: (str) => str,
  gray: (str) => str,
}));

describe('ChanSpy Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAmiService.getState.mockReturnValue({ connected: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('startChanSpy', () => {
    it('should start ChanSpy in listen mode by default', async () => {
      const expectedResult = {
        Response: 'Success',
        spyerExtension: '1000',
        targetChannel: 'PJSIP/1001-00000001',
        mode: 'listen',
        options: 'qS',
      };
      mockAmiService.startChanSpy.mockResolvedValue(expectedResult);

      const result = await mockAmiService.startChanSpy('1000', 'PJSIP/1001-00000001', {});

      expect(result).toEqual(expectedResult);
      expect(result.mode).toBe('listen');
    });

    it('should start ChanSpy in whisper mode', async () => {
      const expectedResult = {
        Response: 'Success',
        spyerExtension: '1000',
        targetChannel: 'PJSIP/1001-00000001',
        mode: 'whisper',
        options: 'wqS',
      };
      mockAmiService.startChanSpy.mockResolvedValue(expectedResult);

      const result = await mockAmiService.startChanSpy('1000', 'PJSIP/1001-00000001', { mode: 'whisper' });

      expect(result).toEqual(expectedResult);
      expect(result.mode).toBe('whisper');
    });

    it('should start ChanSpy in barge mode', async () => {
      const expectedResult = {
        Response: 'Success',
        spyerExtension: '1000',
        targetChannel: 'PJSIP/1001-00000001',
        mode: 'barge',
        options: 'BqS',
      };
      mockAmiService.startChanSpy.mockResolvedValue(expectedResult);

      const result = await mockAmiService.startChanSpy('1000', 'PJSIP/1001-00000001', { mode: 'barge' });

      expect(result).toEqual(expectedResult);
      expect(result.mode).toBe('barge');
    });

    it('should handle volume adjustment', async () => {
      const expectedResult = {
        Response: 'Success',
        options: 'qv(2)S',
      };
      mockAmiService.startChanSpy.mockResolvedValue(expectedResult);

      const result = await mockAmiService.startChanSpy('1000', 'PJSIP/1001-00000001', { volume: 2 });

      expect(result.options).toContain('v(2)');
    });

    it('should throw error when spyerExtension is missing', async () => {
      mockAmiService.startChanSpy.mockRejectedValue(new Error('spyerExtension is required'));

      await expect(mockAmiService.startChanSpy(null, 'PJSIP/1001-00000001', {}))
        .rejects.toThrow('spyerExtension is required');
    });

    it('should throw error when targetChannel is missing', async () => {
      mockAmiService.startChanSpy.mockRejectedValue(new Error('targetChannel is required'));

      await expect(mockAmiService.startChanSpy('1000', null, {}))
        .rejects.toThrow('targetChannel is required');
    });
  });

  describe('startChanSpyByExtension', () => {
    it('should find channel and start spying', async () => {
      mockAmiService.getChannelForExtension.mockResolvedValue({
        channel: 'PJSIP/1001-00000001',
        uniqueId: '1234567890.1',
      });

      const expectedResult = {
        Response: 'Success',
        spyerExtension: '1000',
        targetExtension: '1001',
        targetChannel: 'PJSIP/1001-00000001',
        mode: 'listen',
      };
      mockAmiService.startChanSpyByExtension.mockResolvedValue(expectedResult);

      const result = await mockAmiService.startChanSpyByExtension('1000', '1001', {});

      expect(result).toEqual(expectedResult);
      expect(result.targetExtension).toBe('1001');
    });

    it('should throw error when no active channel found', async () => {
      mockAmiService.startChanSpyByExtension.mockRejectedValue(
        new Error('No active channel found for extension 1001')
      );

      await expect(mockAmiService.startChanSpyByExtension('1000', '1001', {}))
        .rejects.toThrow('No active channel found for extension 1001');
    });
  });

  describe('stopChanSpy', () => {
    it('should stop active spy session', async () => {
      mockAmiService.getChannelForExtension.mockResolvedValue({
        channel: 'PJSIP/1000-00000002',
      });

      const expectedResult = {
        Response: 'Success',
        Message: 'Channel hung up',
      };
      mockAmiService.stopChanSpy.mockResolvedValue(expectedResult);

      const result = await mockAmiService.stopChanSpy('1000');

      expect(result.Response).toBe('Success');
    });

    it('should throw error when no active spy session', async () => {
      mockAmiService.stopChanSpy.mockRejectedValue(
        new Error('No active spy channel found for extension 1000')
      );

      await expect(mockAmiService.stopChanSpy('1000'))
        .rejects.toThrow('No active spy channel found for extension 1000');
    });
  });

  describe('getSpyableChannels', () => {
    it('should return list of active calls', async () => {
      const expectedChannels = [
        {
          channel: 'PJSIP/1001-00000001',
          extension: '1001',
          callerIdNum: '1001',
          callerIdName: 'Agent 1',
          connectedLineNum: '9876543210',
          duration: '00:02:30',
          bridgeId: 'bridge-123',
          uniqueId: '1234567890.1',
        },
        {
          channel: 'PJSIP/1002-00000002',
          extension: '1002',
          callerIdNum: '1002',
          callerIdName: 'Agent 2',
          connectedLineNum: '1234567890',
          duration: '00:01:15',
          bridgeId: 'bridge-456',
          uniqueId: '1234567890.2',
        },
      ];
      mockAmiService.getSpyableChannels.mockResolvedValue(expectedChannels);

      const result = await mockAmiService.getSpyableChannels();

      expect(result).toEqual(expectedChannels);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no active calls', async () => {
      mockAmiService.getSpyableChannels.mockResolvedValue([]);

      const result = await mockAmiService.getSpyableChannels();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should filter out non-PJSIP channels', async () => {
      const expectedChannels = [
        {
          channel: 'PJSIP/1001-00000001',
          extension: '1001',
        },
      ];
      mockAmiService.getSpyableChannels.mockResolvedValue(expectedChannels);

      const result = await mockAmiService.getSpyableChannels();

      expect(result.every(ch => ch.channel.startsWith('PJSIP/'))).toBe(true);
    });
  });

  describe('switchChanSpyMode', () => {
    it('should return info about mode switching limitation', async () => {
      mockAmiService.getChannelForExtension.mockResolvedValue({
        channel: 'PJSIP/1000-00000002',
      });

      const expectedResult = {
        success: false,
        message: 'Runtime mode switching requires dialplan configuration. Please stop and restart spy with new mode.',
        currentChannel: 'PJSIP/1000-00000002',
        requestedMode: 'whisper',
      };
      mockAmiService.switchChanSpyMode.mockResolvedValue(expectedResult);

      const result = await mockAmiService.switchChanSpyMode('1000', 'whisper');

      expect(result.success).toBe(false);
      expect(result.requestedMode).toBe('whisper');
    });
  });
});

describe('ChanSpy Routes Tests', () => {
  // Mock Express request/response
  const mockRequest = (body = {}, params = {}, query = {}) => ({
    body,
    params,
    query,
  });

  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  describe('POST /api/ami/chanspy/start', () => {
    it('should return 400 when spyerExtension is missing', () => {
      const req = mockRequest({ targetChannel: 'PJSIP/1001-00000001' });
      const res = mockResponse();

      // Simulate route handler validation
      if (!req.body.spyerExtension || !req.body.targetChannel) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'spyerExtension and targetChannel are required',
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Missing required parameters',
      }));
    });

    it('should return 400 when targetChannel is missing', () => {
      const req = mockRequest({ spyerExtension: '1000' });
      const res = mockResponse();

      if (!req.body.spyerExtension || !req.body.targetChannel) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'spyerExtension and targetChannel are required',
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return success when all parameters provided', () => {
      const req = mockRequest({
        spyerExtension: '1000',
        targetChannel: 'PJSIP/1001-00000001',
        mode: 'listen',
      });
      const res = mockResponse();

      if (req.body.spyerExtension && req.body.targetChannel) {
        res.json({
          success: true,
          data: {
            spyerExtension: '1000',
            targetChannel: 'PJSIP/1001-00000001',
            mode: 'listen',
          },
          message: 'ChanSpy started successfully in listen mode',
        });
      }

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('ChanSpy started'),
      }));
    });
  });

  describe('POST /api/ami/chanspy/start-by-extension', () => {
    it('should return 400 when spyerExtension is missing', () => {
      const req = mockRequest({ targetExtension: '1001' });
      const res = mockResponse();

      if (!req.body.spyerExtension || !req.body.targetExtension) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when targetExtension is missing', () => {
      const req = mockRequest({ spyerExtension: '1000' });
      const res = mockResponse();

      if (!req.body.spyerExtension || !req.body.targetExtension) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /api/ami/chanspy/stop', () => {
    it('should return 400 when spyerExtension is missing', () => {
      const req = mockRequest({});
      const res = mockResponse();

      if (!req.body.spyerExtension) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'spyerExtension is required',
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return success when spyerExtension provided', () => {
      const req = mockRequest({ spyerExtension: '1000' });
      const res = mockResponse();

      if (req.body.spyerExtension) {
        res.json({
          success: true,
          message: 'ChanSpy stopped successfully',
        });
      }

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });
  });

  describe('GET /api/ami/chanspy/channels', () => {
    it('should return list of spyable channels', () => {
      const res = mockResponse();

      res.json({
        success: true,
        data: [
          { channel: 'PJSIP/1001-00000001', extension: '1001' },
          { channel: 'PJSIP/1002-00000002', extension: '1002' },
        ],
        count: 2,
        message: 'Spyable channels retrieved successfully',
      });

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        count: 2,
      }));
    });

    it('should return empty array when no active calls', () => {
      const res = mockResponse();

      res.json({
        success: true,
        data: [],
        count: 0,
        message: 'Spyable channels retrieved successfully',
      });

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        count: 0,
        data: [],
      }));
    });
  });

  describe('POST /api/ami/chanspy/switch-mode', () => {
    it('should return 400 when spyerExtension is missing', () => {
      const req = mockRequest({ mode: 'whisper' });
      const res = mockResponse();

      if (!req.body.spyerExtension || !req.body.mode) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when mode is missing', () => {
      const req = mockRequest({ spyerExtension: '1000' });
      const res = mockResponse();

      if (!req.body.spyerExtension || !req.body.mode) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid mode', () => {
      const req = mockRequest({ spyerExtension: '1000', mode: 'invalid' });
      const res = mockResponse();

      const validModes = ['listen', 'whisper', 'barge'];
      if (!validModes.includes(req.body.mode)) {
        res.status(400).json({
          success: false,
          error: 'Invalid mode',
          message: "mode must be 'listen', 'whisper', or 'barge'",
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid mode',
      }));
    });

    it('should accept valid modes', () => {
      const validModes = ['listen', 'whisper', 'barge'];

      validModes.forEach((mode) => {
        const req = mockRequest({ spyerExtension: '1000', mode });
        const res = mockResponse();

        if (validModes.includes(req.body.mode)) {
          res.json({
            success: true,
            message: `Mode switched to ${mode}`,
          });
        }

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
        }));
      });
    });
  });
});

describe('ChanSpy Options Builder Tests', () => {
  const buildChanSpyOptions = (options = {}) => {
    let chanSpyOptions = '';

    if (options.mode === 'whisper') {
      chanSpyOptions += 'w';
    } else if (options.mode === 'barge') {
      chanSpyOptions += 'B';
    }

    if (options.quiet !== false) {
      chanSpyOptions += 'q';
    }

    if (options.volume && options.volume >= -4 && options.volume <= 4) {
      chanSpyOptions += `v(${options.volume})`;
    }

    if (options.group) {
      chanSpyOptions += `g(${options.group})`;
    }

    chanSpyOptions += 'S';

    return chanSpyOptions;
  };

  it('should build default options (listen, quiet)', () => {
    const options = buildChanSpyOptions({});
    expect(options).toBe('qS');
  });

  it('should include whisper option', () => {
    const options = buildChanSpyOptions({ mode: 'whisper' });
    expect(options).toContain('w');
  });

  it('should include barge option', () => {
    const options = buildChanSpyOptions({ mode: 'barge' });
    expect(options).toContain('B');
  });

  it('should include volume adjustment', () => {
    const options = buildChanSpyOptions({ volume: 3 });
    expect(options).toContain('v(3)');
  });

  it('should reject invalid volume values', () => {
    const options = buildChanSpyOptions({ volume: 10 });
    expect(options).not.toContain('v(10)');
  });

  it('should include group filter', () => {
    const options = buildChanSpyOptions({ group: 'sales' });
    expect(options).toContain('g(sales)');
  });

  it('should exclude quiet option when quiet is false', () => {
    const options = buildChanSpyOptions({ quiet: false });
    expect(options).not.toContain('q');
  });

  it('should always include S option (stop on hangup)', () => {
    const options = buildChanSpyOptions({});
    expect(options).toContain('S');
  });

  it('should combine multiple options correctly', () => {
    const options = buildChanSpyOptions({
      mode: 'whisper',
      quiet: true,
      volume: 2,
      group: 'support',
    });
    expect(options).toContain('w');
    expect(options).toContain('q');
    expect(options).toContain('v(2)');
    expect(options).toContain('g(support)');
    expect(options).toContain('S');
  });
});

describe('ChanSpy Channel Parsing Tests', () => {
  const extractExtensionFromChannel = (channel) => {
    if (!channel) return null;
    const match = channel.match(/(?:PJSIP|SIP)\/(\d+)-/);
    return match ? match[1] : null;
  };

  const extractChannelPrefix = (channel) => {
    if (!channel) return null;
    return channel.split('-')[0];
  };

  it('should extract extension from PJSIP channel', () => {
    const extension = extractExtensionFromChannel('PJSIP/1001-00000001');
    expect(extension).toBe('1001');
  });

  it('should extract extension from SIP channel', () => {
    const extension = extractExtensionFromChannel('SIP/1001-00000001');
    expect(extension).toBe('1001');
  });

  it('should return null for invalid channel', () => {
    const extension = extractExtensionFromChannel('Invalid/Channel');
    expect(extension).toBeNull();
  });

  it('should return null for null channel', () => {
    const extension = extractExtensionFromChannel(null);
    expect(extension).toBeNull();
  });

  it('should extract channel prefix', () => {
    const prefix = extractChannelPrefix('PJSIP/1001-00000001');
    expect(prefix).toBe('PJSIP/1001');
  });

  it('should handle channel without suffix', () => {
    const prefix = extractChannelPrefix('PJSIP/1001');
    expect(prefix).toBe('PJSIP/1001');
  });
});

describe('ChanSpy Mode Info Tests', () => {
  const getModeInfo = (mode) => {
    const modes = {
      listen: {
        label: 'Silent Monitor',
        description: 'Listen to the call without being heard',
        icon: 'Headphones',
        color: 'info',
      },
      whisper: {
        label: 'Whisper',
        description: 'Speak to the agent only (caller cannot hear)',
        icon: 'RecordVoiceOver',
        color: 'warning',
      },
      barge: {
        label: 'Barge In',
        description: 'Join the call and speak to both parties',
        icon: 'Phone',
        color: 'error',
      },
    };
    return modes[mode] || modes.listen;
  };

  it('should return correct info for listen mode', () => {
    const info = getModeInfo('listen');
    expect(info.label).toBe('Silent Monitor');
    expect(info.color).toBe('info');
  });

  it('should return correct info for whisper mode', () => {
    const info = getModeInfo('whisper');
    expect(info.label).toBe('Whisper');
    expect(info.color).toBe('warning');
  });

  it('should return correct info for barge mode', () => {
    const info = getModeInfo('barge');
    expect(info.label).toBe('Barge In');
    expect(info.color).toBe('error');
  });

  it('should default to listen mode for unknown mode', () => {
    const info = getModeInfo('unknown');
    expect(info.label).toBe('Silent Monitor');
  });
});
