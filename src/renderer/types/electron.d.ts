// Renderer tarafında window.electronAPI'nin tiplerini tanımla
export interface ElectronAPI {
  openFileDialog: (options: {
    title: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;

  saveFileDialog: (options: {
    title: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;

  readFile: (filePath: string) => Promise<string | null>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;

  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}