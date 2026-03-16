import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock all heavy dependencies that src/index.ts imports
vi.mock('./config.js', () => ({
  ASSISTANT_NAME: 'Andy',
  CREDENTIAL_PROXY_PORT: 9999,
  IDLE_TIMEOUT: 300000,
  POLL_INTERVAL: 2000,
  TIMEZONE: 'UTC',
  TRIGGER_PATTERN: /^@Andy\b/i,
}));
vi.mock('./credential-proxy.js', () => ({ startCredentialProxy: vi.fn() }));
vi.mock('./channels/index.js', () => ({}));
vi.mock('./channels/registry.js', () => ({
  getChannelFactory: vi.fn(),
  getRegisteredChannelNames: vi.fn(() => []),
}));
vi.mock('./container-runner.js', () => ({
  runContainerAgent: vi.fn(),
  writeGroupsSnapshot: vi.fn(),
  writeTasksSnapshot: vi.fn(),
}));
vi.mock('./container-runtime.js', () => ({
  cleanupOrphans: vi.fn(),
  ensureContainerRuntimeRunning: vi.fn(),
  PROXY_BIND_HOST: '0.0.0.0',
}));
vi.mock('./db.js', () => ({
  getAllChats: vi.fn(() => []),
  getAllRegisteredGroups: vi.fn(() => ({})),
  getAllSessions: vi.fn(() => ({})),
  getAllTasks: vi.fn(() => []),
  getMessagesSince: vi.fn(() => []),
  getNewMessages: vi.fn(() => ({ messages: [], newTimestamp: '' })),
  getRegisteredGroup: vi.fn(),
  getRouterState: vi.fn(),
  initDatabase: vi.fn(),
  setRegisteredGroup: vi.fn(),
  setRouterState: vi.fn(),
  setSession: vi.fn(),
  storeChatMetadata: vi.fn(),
  storeMessage: vi.fn(),
}));
vi.mock('./group-queue.js', () => ({
  GroupQueue: class MockGroupQueue {
    enqueueMessageCheck = vi.fn();
    registerProcess = vi.fn();
    setProcessMessagesFn = vi.fn();
    sendMessage = vi.fn();
    notifyIdle = vi.fn();
    closeStdin = vi.fn();
    shutdown = vi.fn();
  },
}));
vi.mock('./group-folder.js', () => ({ resolveGroupFolderPath: vi.fn() }));
vi.mock('./ipc.js', () => ({ startIpcWatcher: vi.fn() }));
vi.mock('./router.js', () => ({
  findChannel: vi.fn(),
  formatMessages: vi.fn(),
  formatOutbound: vi.fn(),
  escapeXml: vi.fn(),
}));
vi.mock('./sender-allowlist.js', () => ({
  isSenderAllowed: vi.fn(),
  isTriggerAllowed: vi.fn(),
  loadSenderAllowlist: vi.fn(() => ({})),
  shouldDropMessage: vi.fn(),
}));
vi.mock('./task-scheduler.js', () => ({ startSchedulerLoop: vi.fn() }));
vi.mock('./logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

import { startTypingLoop } from './index.js';
import type { Channel } from './types.js';

describe('startTypingLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls setTyping immediately on start', () => {
    const channel = {
      setTyping: vi.fn().mockResolvedValue(undefined),
    } as unknown as Channel;

    startTypingLoop(channel, 'tg:123');

    expect(channel.setTyping).toHaveBeenCalledOnce();
    expect(channel.setTyping).toHaveBeenCalledWith('tg:123', true);
  });

  it('calls setTyping every 4500ms', () => {
    const channel = {
      setTyping: vi.fn().mockResolvedValue(undefined),
    } as unknown as Channel;

    startTypingLoop(channel, 'tg:123');

    vi.advanceTimersByTime(9000);

    // immediate + 2 intervals = 3
    expect(channel.setTyping).toHaveBeenCalledTimes(3);
  });

  it('stops interval when stop function called', () => {
    const channel = {
      setTyping: vi.fn().mockResolvedValue(undefined),
    } as unknown as Channel;

    const stop = startTypingLoop(channel, 'tg:123');
    stop();

    vi.advanceTimersByTime(9000);

    // Only the initial call
    expect(channel.setTyping).toHaveBeenCalledTimes(1);
  });

  it('handles channels without setTyping', () => {
    const channel = {} as unknown as Channel;

    // Should not throw
    expect(() => startTypingLoop(channel, 'tg:123')).not.toThrow();
  });
});
