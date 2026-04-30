# Input:  text string and pattern string
# Output: list of all starting indices where pattern occurs in text

def kmp_find_all(text, pattern):
    """KMP string matching - O(n+m) guaranteed."""
    n, m = len(text), len(pattern)
    if m == 0:
        return []
    lps = [0] * m
    k = 0
    for i in range(1, m):
        while k > 0 and pattern[k] != pattern[i]:
            k = lps[k - 1]
        if pattern[k] == pattern[i]:
            k += 1
        lps[i] = k
    matches, j = [], 0
    for i in range(n):
        while j > 0 and pattern[j] != text[i]:
            j = lps[j - 1]
        if pattern[j] == text[i]:
            j += 1
        if j == m:
            matches.append(i - m + 1)
            j = lps[j - 1]
    return matches
