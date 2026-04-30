// Input:  text (string), pattern (string)
// Output: array of starting indices of all matches

function rabinKarp(text, pattern) {
  const n = text.length, m = pattern.length;
  if (m > n) return [];
  const BASE = 256n, MOD = 1000000007n;
  let h = 1n;
  for (let i = 0; i < m - 1; i++) h = (h * BASE) % MOD;

  let pHash = 0n, tHash = 0n;
  for (let i = 0; i < m; i++) {
    pHash = (pHash * BASE + BigInt(pattern.charCodeAt(i))) % MOD;
    tHash = (tHash * BASE + BigInt(text.charCodeAt(i))) % MOD;
  }
  const matches = [];
  for (let i = 0; i <= n - m; i++) {
    if (pHash === tHash && text.slice(i, i + m) === pattern) {
      matches.push(i);
    }
    if (i < n - m) {
      tHash = ((tHash - BigInt(text.charCodeAt(i)) * h) * BASE
        + BigInt(text.charCodeAt(i + m))) % MOD;
      if (tHash < 0n) tHash += MOD;
    }
  }
  return matches;
}
