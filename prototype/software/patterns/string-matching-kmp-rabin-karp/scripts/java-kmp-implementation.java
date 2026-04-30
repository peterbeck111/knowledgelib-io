// Input:  text (String), pattern (String)
// Output: List<Integer> of all starting indices

import java.util.ArrayList;
import java.util.List;

public static List<Integer> kmpSearch(String text, String pattern) {
    int n = text.length(), m = pattern.length();
    int[] lps = new int[m];
    // Build LPS array
    for (int i = 1, len = 0; i < m; ) {
        if (pattern.charAt(i) == pattern.charAt(len)) {
            lps[i++] = ++len;
        } else if (len > 0) {
            len = lps[len - 1]; // don't increment i
        } else {
            lps[i++] = 0;
        }
    }
    // Search
    List<Integer> matches = new ArrayList<>();
    for (int i = 0, j = 0; i < n; ) {
        if (text.charAt(i) == pattern.charAt(j)) { i++; j++; }
        if (j == m) { matches.add(i - j); j = lps[j - 1]; }
        else if (i < n && text.charAt(i) != pattern.charAt(j)) {
            if (j > 0) j = lps[j - 1];
            else i++;
        }
    }
    return matches;
}
