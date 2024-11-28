import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

const handler = {
  send(channel: string, value: unknown) {
    ipcRenderer.send(channel, value);
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
};

contextBridge.exposeInMainWorld("ipc", handler);
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: ipcRenderer.invoke.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer),
    send: ipcRenderer.send.bind(ipcRenderer),
    removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
    openSSH: (host: string, username: string) => {
      ipcRenderer.send("open-terminal", { host, username });
    },
  },
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
});
export type IpcHandler = typeof handler;
