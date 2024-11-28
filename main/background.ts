import path from "path";
import { app, ipcMain, Tray, Notification, nativeImage } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { startMonitoring, stopMonitoring, updateTrayMenu } from "./helpers/monitor";
import { loadData, saveData } from "./helpers/storage"; // 导入数据持久化工具
import { MonitorItem } from "@/types/Monitor";
import { ProxyConfig } from "@/types/UserConfig";
import SSH2Shell from "ssh2shell";

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

let tray: Tray | null = null;

// 从存储中加载已保存的监控列表
const monitoredUrls: MonitorItem[] = loadData();

(async () => {
  await app.whenReady();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 创建托盘
  const iconPath = path.join(__dirname, "../renderer/public/images/icon.png");
  let trayIcon = nativeImage.createFromPath(iconPath);
  trayIcon = trayIcon.resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip("Uptime Monitor");

  updateTrayMenu(tray, monitoredUrls);

  // 开始监控已保存的 URL
  startMonitoring(monitoredUrls, (status) => {
    updateTrayMenu(tray, monitoredUrls);

    // 保存更新到持久化数据
    saveData<MonitorItem[]>(monitoredUrls);

    // 向渲染进程发送状态更新
    if (mainWindow) {
      mainWindow.webContents.send("monitor-updated", monitoredUrls);
    }
    // 推送通知（仅在出现错误时）
    if (status.error) {
      new Notification({
        title: "Connection Error",
        body: `${status.url} is unreachable!`,
      }).show();
    }
  });

  // 监听添加 URL 的事件
  ipcMain.handle("add-monitor", async (_, newMonitor: MonitorItem) => {
    // 添加到监控列表
    monitoredUrls.push(newMonitor);

    // 持久化数据
    saveData<MonitorItem[]>(monitoredUrls);

    // 立即更新托盘菜单
    updateTrayMenu(tray, monitoredUrls);

    // 开始监控新添加的 URL
    startMonitoring([newMonitor], (status) => {
      updateTrayMenu(tray, monitoredUrls);
      saveData<MonitorItem[]>(monitoredUrls);

      // 推送通知（仅在出现错误时）
      if (status.error) {
        new Notification({
          title: "Connection Error",
          body: `${status.url} is unreachable!`,
        }).show();
      }
    });
  });
  ipcMain.handle(
  "update-monitor",
    async (_, id: string, updates: Partial<MonitorItem>) => {
      const monitorIndex = monitoredUrls.findIndex((monitor) => monitor.id === id);
      if (monitorIndex !== -1) {
        // 更新监控项属性
        monitoredUrls[monitorIndex] = {
          ...monitoredUrls[monitorIndex],
          ...updates,
        };

        // 更新持久化数据
        saveData(monitoredUrls);

        // 根据是否激活重新启动或停止监控任务
        if (updates.active !== undefined) {
          if (updates.active) {
            // 如果激活，启动监控任务
            startMonitoring([monitoredUrls[monitorIndex]], (status) => {
              updateTrayMenu(tray, monitoredUrls);

              // 保存更新到持久化数据
              saveData(monitoredUrls);

              // 向渲染进程发送状态更新
              if (mainWindow) {
                mainWindow.webContents.send("monitor-updated", monitoredUrls);
              }

              // 推送通知（仅在出现错误时）
              if (status.error) {
                new Notification({
                  title: "Connection Error",
                  body: `${status.url} is unreachable!`,
                }).show();
              }
            });
          } else {
            // 如果未激活，停止对应的监控任务
            stopMonitoring(id);
          }
        }

        // 向渲染进程发送更新后的列表
        if (mainWindow) {
          mainWindow.webContents.send("monitor-updated", monitoredUrls);
        }
      }
    }
  );
    ipcMain.handle("delete-monitor", async (_, id: string) => {
    // 查找监控项索引
    const monitorIndex = monitoredUrls.findIndex((monitor) => monitor.id === id);

    if (monitorIndex !== -1) {
      // 停止对应的监控任务
      stopMonitoring(id);

      // 从监控列表中移除
      monitoredUrls.splice(monitorIndex, 1);

      // 更新持久化数据
      saveData(monitoredUrls);

      // 更新托盘菜单
      updateTrayMenu(tray, monitoredUrls);

      // 向渲染进程发送更新后的列表
      if (mainWindow) {
        mainWindow.webContents.send("monitor-updated", monitoredUrls);
      }
    }
  });
  ipcMain.handle("get-monitors", () => {
    const monitoredUrls = loadData();
    return monitoredUrls; // 返回监控列表
  });

  ipcMain.handle("set-proxy-config", async (_, proxyConfig: ProxyConfig) => {
    saveData(proxyConfig, "config");
  });

  ipcMain.handle("get-proxy-config", async () => {
    return loadData("config");
  });
  if (isProd) {
    await mainWindow.loadURL("app://./home");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }


  ipcMain.on("window-minimize", () => {
    mainWindow.minimize();
  });

  ipcMain.on("window-maximize", () => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on("window-close", () => {
    mainWindow.close();
  });

  ipcMain.on("open-terminal", (_, { host, username }) => {
    const command = `ssh ${username}@${host}`;
    require("child_process").exec(command, (error) => {
      if (error) {
        console.error("Failed to open SSH:", error);
      }
    });
  });

  ipcMain.on("execute-ssh-command", (_, sshConfig, command) => {
    const { host, port, username, password } = sshConfig;

    const ssh = new SSH2Shell({
      server: {
        host,
        port: port || 22,
        userName: username,
        password,
      },
      commands: [command],
      msg: {
        send: (message) => console.log(`SSH Message: ${message}`),
      },
    });

    ssh.on("error", (err) => {
      console.error(`SSH Error: ${err.message}`);
    });

    ssh.on("end", () => {
      console.log(`SSH session ended.`);
    });

    ssh.connect();
  });
})();

app.on("window-all-closed", () => {
  app.quit();
});
