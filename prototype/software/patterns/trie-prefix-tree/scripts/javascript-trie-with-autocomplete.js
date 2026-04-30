// Input:  words array, prefix string
// Output: array of autocomplete suggestions

class TrieNode {
  constructor() {
    this.children = new Map();  // char -> TrieNode
    this.isEnd = false;
  }
}

class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch))
        node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }

  search(word) {
    const node = this.#find(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix) {
    return this.#find(prefix) !== null;
  }

  autocomplete(prefix, limit = 10) {
    const node = this.#find(prefix);
    if (!node) return [];
    const results = [];
    const dfs = (n, path) => {
      if (results.length >= limit) return;
      if (n.isEnd) results.push(prefix + path);
      for (const [ch, child] of [...n.children].sort())
        dfs(child, path + ch);
    };
    dfs(node, "");
    return results;
  }

  #find(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return null;
      node = node.children.get(ch);
    }
    return node;
  }
}
