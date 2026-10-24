const timeout = 12_000;

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeout),
    headers: { accept: 'application/json', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`Blockchain provider returned HTTP ${response.status}`);
  return response.json();
}

function validAddress(address) {
  return typeof address === 'string' && address.length > 0 && address.length <= 160 && !/\s/.test(address);
}

export async function getBalance(asset, address, network = null) {
  if (!validAddress(address)) throw new Error('That address is empty or malformed.');
  switch (asset) {
    case 'BTC': {
      const d = await getJson(`https://blockstream.info/api/address/${encodeURIComponent(address)}`);
      const chain = d.chain_stats || {};
      const mempool = d.mempool_stats || {};
      const confirmed = (chain.funded_txo_sum || 0) - (chain.spent_txo_sum || 0);
      const unconfirmed = ((mempool.funded_txo_sum || 0) - (mempool.spent_txo_sum || 0));
      return {
        asset: 'BTC', network: 'Bitcoin', balance: confirmed / 1e8,
        unconfirmed: unconfirmed / 1e8,
        received: ((chain.funded_txo_sum || 0) + (mempool.funded_txo_sum || 0)) / 1e8,
        transactions: (chain.tx_count || 0) + (mempool.tx_count || 0)
      };
    }
    case 'LTC': {
      const d = await getJson(`https://litecoinspace.org/api/address/${encodeURIComponent(address)}`);
      const chain = d.chain_stats || {};
      const mempool = d.mempool_stats || {};
      const confirmed = (chain.funded_txo_sum || 0) - (chain.spent_txo_sum || 0);
      const unconfirmed = (mempool.funded_txo_sum || 0) - (mempool.spent_txo_sum || 0);
      return {
        asset: 'LTC', network: 'Litecoin', balance: confirmed / 1e8,
        unconfirmed: unconfirmed / 1e8,
        received: ((chain.funded_txo_sum || 0) + (mempool.funded_txo_sum || 0)) / 1e8,
        transactions: (chain.tx_count || 0) + (mempool.tx_count || 0)
      };
    }
    case 'SOL': {
      const d = await getJson('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address, { commitment: 'confirmed' }] })
      });
      if (d.error || !Number.isFinite(d.result?.value)) throw new Error('Solana provider could not verify that address.');
      return { asset: 'SOL', network: 'Solana', balance: d.result.value / 1e9, unconfirmed: null, received: null, transactions: null };
    }
    default:
      throw new Error('Unsupported asset.');
  }
}

export function formatAmount(value, max = 8) {
  if (value === null || value === undefined) return 'N/A';
  if (!Number.isFinite(value)) return 'N/A';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: max });
}

const COIN_IDS = { BTC: 'bitcoin', LTC: 'litecoin', SOL: 'solana' };
export async function getMarketInfo(asset) {
  const id = COIN_IDS[asset];
  if (!id) return null;
  const d = await getJson('https://api.coingecko.com/api/v3/simple/price?ids=' + id + '&vs_currencies=usd&include_24hr_change=true');
  const item = d[id];
  if (!item || !Number.isFinite(item.usd)) return null;
  return { price: item.usd, change: Number.isFinite(item.usd_24h_change) ? item.usd_24h_change : null };
}
