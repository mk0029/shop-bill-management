export interface ShareAdapter {
  share(url: string, title: string, text?: string): Promise<boolean>;
  getSupported(): boolean;
}
