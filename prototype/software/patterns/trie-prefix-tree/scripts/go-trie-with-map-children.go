// Input:  strings to insert, prefix to search
// Output: bool for search, []string for autocomplete

package trie

type TrieNode struct {
    Children map[byte]*TrieNode
    IsEnd    bool
}

type Trie struct {
    Root *TrieNode
}

func NewTrie() *Trie {
    return &Trie{Root: &TrieNode{Children: make(map[byte]*TrieNode)}}
}

func (t *Trie) Insert(word string) {
    node := t.Root
    for i := 0; i < len(word); i++ {
        ch := word[i]
        if _, ok := node.Children[ch]; !ok {
            node.Children[ch] = &TrieNode{Children: make(map[byte]*TrieNode)}
        }
        node = node.Children[ch]
    }
    node.IsEnd = true
}

func (t *Trie) Search(word string) bool {
    node := t.find(word)
    return node != nil && node.IsEnd
}

func (t *Trie) StartsWith(prefix string) bool {
    return t.find(prefix) != nil
}

func (t *Trie) find(prefix string) *TrieNode {
    node := t.Root
    for i := 0; i < len(prefix); i++ {
        child, ok := node.Children[prefix[i]]
        if !ok { return nil }
        node = child
    }
    return node
}
