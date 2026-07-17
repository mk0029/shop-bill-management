export interface DownloadAdapter {
  download(url: string, filename: string): Promise<void>;
  getSupported(): boolean;
}
