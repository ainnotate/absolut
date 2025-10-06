declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement | null, config: any) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
          revoke: (hint: string, callback: (response: any) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export {};