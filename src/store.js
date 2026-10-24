import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
const FILE = path.join(DATA_DIR, 'zentro.json');
const defaults = { wallets: {}, receiving: {}, upiQrUrls: {}, upiIds: {} };

async function readStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8'));
    return {
      wallets: parsed.wallets && typeof parsed.wallets === 'object' ? parsed.wallets : {},
      receiving: parsed.receiving && typeof parsed.receiving === 'object' ? parsed.receiving : {},
      upiQrUrls: parsed.upiQrUrls && typeof parsed.upiQrUrls === 'object' ? parsed.upiQrUrls : {},
      upiIds: parsed.upiIds && typeof parsed.upiIds === 'object' ? parsed.upiIds : {}
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return structuredClone(defaults);
  }
}

let queue = Promise.resolve();
export async function getStore() {
  return readStore();
}

export function updateStore(mutator) {
  queue = queue.then(async () => {
    const data = await readStore();
    await mutator(data);
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = FILE + '.tmp';
    await fs.writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await fs.rename(temp, FILE);
  });
  return queue;
}
