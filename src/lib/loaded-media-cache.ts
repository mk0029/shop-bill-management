const loadedMediaUrls = new Set<string>();

export function markMediaLoaded(url: string) {
  loadedMediaUrls.add(url);
}

export function isMediaLoaded(url: string): boolean {
  return loadedMediaUrls.has(url);
}
