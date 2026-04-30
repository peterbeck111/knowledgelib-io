# Input:  List of (doc_id, text) tuples
# Output: Inverted index mapping terms to doc_ids with positions

import re
from collections import defaultdict

def build_inverted_index(documents):
    """Build a simple inverted index with term positions."""
    index = defaultdict(list)  # term -> [(doc_id, [positions])]
    for doc_id, text in documents:
        tokens = re.findall(r'\w+', text.lower())
        term_positions = defaultdict(list)
        for pos, token in enumerate(tokens):
            term_positions[token].append(pos)
        for term, positions in term_positions.items():
            index[term].append((doc_id, positions))
    return dict(index)

def search(index, query):
    """Search the inverted index, return doc_ids ranked by term frequency."""
    tokens = re.findall(r'\w+', query.lower())
    doc_scores = defaultdict(int)
    for token in tokens:
        for doc_id, positions in index.get(token, []):
            doc_scores[doc_id] += len(positions)  # TF scoring
    return sorted(doc_scores.items(), key=lambda x: -x[1])

# Usage
docs = [(1, "search engine design"), (2, "search architecture patterns"), (3, "database engine internals")]
idx = build_inverted_index(docs)
results = search(idx, "search engine")
# Returns: [(1, 2), (2, 1), (3, 1)] -- doc 1 scores highest (both terms match)
