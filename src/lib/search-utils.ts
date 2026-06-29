function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function wordHasPrefix(word: string, prefix: string): boolean {
  return word.length >= prefix.length && word.slice(0, prefix.length) === prefix;
}

function matchSearchToken(searchToken: string, words: string[]): boolean {
  const hasDigit = /\d/.test(searchToken);
  if (hasDigit) {
    return words.some((w) => w === searchToken);
  }
  return words.some((w) => wordHasPrefix(w, searchToken));
}

export function matchesSearch(query: string, searchableText: string): boolean {
  if (!query.trim()) return true;
  const searchTokens = tokenize(query);
  const words = tokenize(searchableText);
  if (words.length === 0) return false;
  return searchTokens.every((token) => matchSearchToken(token, words));
}
