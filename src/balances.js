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
    case 'USDT': {
      if (network === 'TRC20') {
        const d = await getJson(`https://apilist.tronscanapi.com/api/account/tokens?address=${encodeURIComponent(address)}&start=0&limit=200&hidden=0&show=0&sortType=0&sortBy=0`);
        const token = (d.data || []).find(t => String(t.tokenAbbr || t.tokenName || '').toUpperCase() === 'USDT' &&
          String(t.tokenId || t.tokenAddress || '').toLowerCase() === 'txla2f1bll8gjkw3q9kcw5xmwv6s9r4k4');
        if (!token) return { asset: 'USDT', network: 'TRC20 (TRON)', balance: 0, unconfirmed: null, received: null, transactions: null };
        return { asset: 'USDT', network: 'TRC20 (TRON)', balance: Number(token.balance || 0) / (10 ** Number(token.tokenDecimal ?? 6)), unconfirmed: null, received: null, transactions: null };
      }
      if (network === 'ERC20') {
        const d = await getJson('https://ethereum-rpc.publicnode.com', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: '0xdAC17F958D2ee523a2206206994597C13D831ec7', data: '0x70a08231' + address.toLowerCase().replace(/^0x/, '').padStart(64, '0') }, 'latest'] })
        });
        if (d.error || typeof d.result !== 'string') throw new Error('Ethereum provider could not verify that address.');
        return { asset: 'USDT', network: 'ERC20 (Ethereum)', balance: Number(BigInt(d.result)) / 1e6, unconfirmed: null, received: null, transactions: null };
      }
      throw new Error('Choose the USDT network: TRC20 or ERC20.');
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