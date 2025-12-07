import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { Session, Message, ProviderName } from '../types.js';
import { ConversationHistory } from './history.js';

const SESSION_DIR = path.join(os.homedir(), '.config', 'manu-code', 'sessions');

export async function saveSession(
  history: ConversationHistory,
  provider: ProviderName,
  model: string,
  totalTokens: number,
  totalCost: number,
  sessionId?: string
): Promise<string> {
  const id = sessionId || generateSessionId();
  const now = new Date();

  const session: Session = {
    id,
    createdAt: now,
    updatedAt: now,
    provider,
    model,
    messages: history.getMessages(),
    totalTokens,
    totalCost,
  };

  await ensureSessionDir();

  const filePath = path.join(SESSION_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');

  return id;
}

export async function loadSession(sessionId: string): Promise<Session | null> {
  try {
    const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const session = JSON.parse(content) as Session;

    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);

    return session;
  } catch {
    return null;
  }
}

export async function loadLatestSession(): Promise<Session | null> {
  try {
    await ensureSessionDir();
    const files = await fs.readdir(SESSION_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return null;
    }

    // Get file stats and sort by modification time
    const fileStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(SESSION_DIR, file);
        const stat = await fs.stat(filePath);
        return { file, mtime: stat.mtime };
      })
    );

    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const latestFile = fileStats[0].file;
    const sessionId = latestFile.replace('.json', '');

    return loadSession(sessionId);
  } catch {
    return null;
  }
}

export async function listSessions(limit = 10): Promise<Session[]> {
  try {
    await ensureSessionDir();
    const files = await fs.readdir(SESSION_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    // Get file stats and sort by modification time
    const fileStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(SESSION_DIR, file);
        const stat = await fs.stat(filePath);
        return { file, mtime: stat.mtime };
      })
    );

    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const sessions: Session[] = [];
    for (const { file } of fileStats.slice(0, limit)) {
      const sessionId = file.replace('.json', '');
      const session = await loadSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  } catch {
    return [];
  }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export function restoreHistory(session: Session, history: ConversationHistory): void {
  history.fromJSON(session.messages);
}

async function ensureSessionDir(): Promise<void> {
  await fs.mkdir(SESSION_DIR, { recursive: true });
}

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

export function formatSessionSummary(session: Session): string {
  const date = session.updatedAt.toLocaleDateString();
  const time = session.updatedAt.toLocaleTimeString();
  const messageCount = session.messages.filter((m) => m.role !== 'system').length;

  // Get first user message as preview
  const firstUserMessage = session.messages.find((m) => m.role === 'user');
  let preview = '';
  if (firstUserMessage) {
    const content =
      typeof firstUserMessage.content === 'string'
        ? firstUserMessage.content
        : firstUserMessage.content.map((b) => b.text || '').join(' ');
    preview = content.slice(0, 50) + (content.length > 50 ? '...' : '');
  }

  return `${session.id} | ${date} ${time} | ${messageCount} messages | ${preview}`;
}
