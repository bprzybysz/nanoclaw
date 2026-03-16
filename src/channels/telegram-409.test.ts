import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Mocks ---

vi.mock('./registry.js', () => ({ registerChannel: vi.fn() }));
vi.mock('../env.js', () => ({ readEnvFile: vi.fn(() => ({})) }));
vi.mock('../config.js', () => ({
  ASSISTANT_NAME: 'Andy',
  TRIGGER_PATTERN: /^@Andy\b/i,
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../logger.js', () => ({ logger: mockLogger }));

// --- Grammy mock with 409 support ---

type Handler = (...args: any[]) => any;
type StartOpts = { onStart: (botInfo: any) => void };

const { botRef, MockGrammyError } = vi.hoisted(() => {
  class _MockGrammyError extends Error {
    ok = false as const;
    error_code: number;
    description: string;
    method: string;
    payload: Record<string, unknown>;

    constructor(message: string, error_code: number) {
      super(message);
      this.name = 'GrammyError';
      this.error_code = error_code;
      this.description = message;
      this.method = 'getUpdates';
      this.payload = {};
    }
  }
  return {
    botRef: { current: null as any },
    MockGrammyError: _MockGrammyError,
  };
});

vi.mock('grammy', () => ({
  Bot: class MockBot {
    token: string;
    commandHandlers = new Map<string, Handler>();
    filterHandlers = new Map<string, Handler[]>();
    errorHandler: Handler | null = null;

    api = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendChatAction: vi.fn().mockResolvedValue(undefined),
    };

    constructor(token: string) {
      this.token = token;
      botRef.current = this;
    }

    command(name: string, handler: Handler) {
      this.commandHandlers.set(name, handler);
    }

    on(filter: string, handler: Handler) {
      const existing = this.filterHandlers.get(filter) || [];
      existing.push(handler);
      this.filterHandlers.set(filter, existing);
    }

    catch(handler: Handler) {
      this.errorHandler = handler;
    }

    start = vi.fn(async (opts: StartOpts) => {
      opts.onStart({ username: 'andy_ai_bot', id: 12345 });
    });

    stop = vi.fn(async () => {});
  },
  GrammyError: MockGrammyError,
}));

import { TelegramChannel, TelegramChannelOpts } from './telegram.js';

function createTestOpts(): TelegramChannelOpts {
  return {
    onMessage: vi.fn(),
    onChatMetadata: vi.fn(),
    registeredGroups: vi.fn(() => ({})),
  };
}

describe('TelegramChannel 409 recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('recovers from 409 by stopping and restarting after 35s', async () => {
    const channel = new TelegramChannel('test-token', createTestOpts());
    await channel.connect();

    const bot = botRef.current;
    bot.start.mockClear();

    const botError = {
      error: new MockGrammyError('409: Conflict', 409),
      message: '409: Conflict',
    };
    bot.errorHandler(botError);

    // Not called yet — 35s delay
    expect(bot.stop).not.toHaveBeenCalled();

    // Advance past the 35s delay
    await vi.advanceTimersByTimeAsync(35_000);

    expect(bot.stop).toHaveBeenCalledOnce();
    expect(bot.start).toHaveBeenCalledOnce();
  });

  it('does not restart on non-409 errors', async () => {
    const channel = new TelegramChannel('test-token', createTestOpts());
    await channel.connect();

    const bot = botRef.current;
    bot.start.mockClear();

    const botError = {
      error: new MockGrammyError('400: Bad Request', 400),
      message: '400: Bad Request',
    };
    bot.errorHandler(botError);

    await vi.advanceTimersByTimeAsync(35_000);

    expect(bot.stop).not.toHaveBeenCalled();
    expect(bot.start).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      { err: '400: Bad Request' },
      'Telegram bot error',
    );
  });

  it('stops reconnecting after 3 attempts', async () => {
    const channel = new TelegramChannel('test-token', createTestOpts());
    await channel.connect();

    const bot = botRef.current;
    bot.start.mockClear();

    // Make start NOT reset the counter (simulate failed reconnect still running)
    bot.start.mockImplementation(async () => {});

    const make409 = () => ({
      error: new MockGrammyError('409: Conflict', 409),
      message: '409: Conflict',
    });

    // Fire all 4 errors before any timer fires — counter increments to 4
    for (let i = 0; i < 4; i++) {
      bot.errorHandler(make409());
    }

    // 4th should have logged the max-attempts error immediately
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Telegram 409: max reconnect attempts reached, giving up',
    );

    // Advance timers to let the 3 scheduled reconnects fire
    await vi.advanceTimersByTimeAsync(35_000);

    // Only 3 reconnects (4th was rejected before scheduling)
    expect(bot.start).toHaveBeenCalledTimes(3);
  });
});
