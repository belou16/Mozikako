import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'connections.json');

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(TOKENS_FILE);
  } catch {
    await fs.writeFile(TOKENS_FILE, JSON.stringify({ connections: {} }, null, 2), 'utf-8');
  }
}

async function readStore() {
  await ensureDataFile();
  const raw = await fs.readFile(TOKENS_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return { connections: {} };
  }
}

async function writeStore(data) {
  await ensureDataFile();
  await fs.writeFile(TOKENS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getConnection(provider) {
  const store = await readStore();
  return store.connections?.[provider] || null;
}

export async function setConnection(provider, payload) {
  const store = await readStore();
  store.connections = store.connections || {};
  store.connections[provider] = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.connections[provider];
}

export async function clearConnection(provider) {
  const store = await readStore();
  store.connections = store.connections || {};
  delete store.connections[provider];
  await writeStore(store);
}

export async function listConnectionStatus(providers) {
  const store = await readStore();
  const connections = store.connections || {};
  return providers.map((provider) => ({
    provider,
    connected: Boolean(connections[provider]?.accessToken),
    updatedAt: connections[provider]?.updatedAt || null,
  }));
}
