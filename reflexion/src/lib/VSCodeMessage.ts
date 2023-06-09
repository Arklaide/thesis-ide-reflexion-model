declare const acquireVsCodeApi: Function;

interface VSCodeApi {
  getState: () => any;
  setState: (newState: any) => any;
  postMessage: (message: any) => void;
}

class VSCode {
  private readonly vscodeApi: VSCodeApi = acquireVsCodeApi();

  public postMessage(message: any): void {
    this.vscodeApi.postMessage(message);
  }

  public onMessage(callback: (message: any) => void): () => void {
    window.addEventListener("message", callback);
    return () => window.removeEventListener("message", callback);
  }
}

export const VSCodeMessage: VSCode = new VSCode();
