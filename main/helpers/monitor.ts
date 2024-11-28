import axios from "axios";
import ping from "ping";
import { Tray, Menu } from "electron";
import { MonitorItem } from "@/types/Monitor";
import { loadData } from "./storage";
import { ProxyConfig } from "@/types/UserConfig";
import {HttpProxyAgent} from "http-proxy-agent";
import {HttpsProxyAgent} from "https-proxy-agent";
const statuses: Record<string, MonitorItem> = {}; // 存储所有监控项的状态
const activeIntervals: Map<string, NodeJS.Timeout> = new Map(); // 用于跟踪每个监控项的定时器引用

// 获取全局代理配置
const globalProxyConfig: ProxyConfig | undefined = loadData("config");

/**
 * 创建 axios 实例，根据传入的代理配置
 * @param proxyConfig 代理配置
 */
const createAxiosInstance = (proxyConfig?: ProxyConfig) => {
  return axios.create(
    proxyConfig
      ? {
          proxy: false, // 禁用默认代理
          httpAgent: new HttpProxyAgent(
            `http://${
              proxyConfig.username
                ? `${proxyConfig.username}:${proxyConfig.password}@`
                : ""
            }${proxyConfig.host}${proxyConfig.port ? `:${proxyConfig.port}` : ""}`
          ),
          httpsAgent: new HttpsProxyAgent(
            `https://${
              proxyConfig.username
                ? `${proxyConfig.username}:${proxyConfig.password}@`
                : ""
            }${proxyConfig.host}${proxyConfig.port ? `:${proxyConfig.port}` : ""}`
          ),
        }
      : {}
  );
};

/**
 * 根据监控项的代理配置，创建适用的 axios 实例
 * @param monitor 监控项
 */
const getAxiosInstanceForMonitor = (monitor: MonitorItem) => {
  if (monitor.proxyConfig) {
    console.log(monitor.proxyConfig,'-monitor.proxyConfig')
    return createAxiosInstance(monitor.proxyConfig);
  } else if (globalProxyConfig && !monitor.ignoreGlobalProxy) {
    console.log(globalProxyConfig ,'-globalProxyConfig')
    return createAxiosInstance(globalProxyConfig);
  }
  return createAxiosInstance();
};

/**
 * 启动监控逻辑
 * @param endpoints 要监控的 URL 列表
 * @param onUpdate 回调函数，在状态更新时调用
 */
export const startMonitoring = (
  endpoints: MonitorItem[],
  onUpdate: (status: MonitorItem) => void
) => {
  endpoints.forEach((monitor) => {
    if (!monitor.active) return;

    // 如果已存在，先停止旧的监控任务
    if (activeIntervals.has(monitor.id)) {
      clearInterval(activeIntervals.get(monitor.id)!);
      activeIntervals.delete(monitor.id);
    }

    // 获取适用的 axios 实例
    const axiosInstance = getAxiosInstanceForMonitor(monitor);

    const interval = setInterval(async () => {
      try {
        let status: MonitorItem;

        if (monitor.method === "HTTP") {
          const start = Date.now();
          await axiosInstance.get(monitor.url, { timeout: 5000 });
          const latency = Date.now() - start;
          status = { ...monitor, status: "Online", latency };
        } else if (monitor.method === "ICMP") {
          const res = await ping.promise.probe(monitor.url, {
            timeout: 5,
            extra:
              monitor.proxyConfig || (globalProxyConfig && !monitor.ignoreGlobalProxy)
                ? ["-S", monitor.proxyConfig?.host || globalProxyConfig?.host]
                : [],
          });
          status = {
            ...monitor,
            status: res.alive ? "Online" : "Offline",
            latency: res.time,
          };
        } else {
          throw new Error("Unsupported method");
        }

        statuses[monitor.url] = status;
        monitor.status = status.status;
        monitor.time = status.latency;
        onUpdate(status);
      } catch {
        statuses[monitor.url] = {
          ...monitor,
          status: "Offline",
          latency: 0,
          error: true,
        };
        monitor.status = "Offline";
        monitor.time = 0;
        onUpdate(statuses[monitor.url]);
      }
    }, monitor.frequency);

    activeIntervals.set(monitor.id, interval);
  });
};

/**
 * 停止特定监控任务
 * @param id 监控任务的 ID
 */
export const stopMonitoring = (id: string) => {
  if (activeIntervals.has(id)) {
    clearInterval(activeIntervals.get(id)!);
    activeIntervals.delete(id);
  }
};

/**
 * 停止所有监控任务
 */
export const stopAllMonitoring = () => {
  activeIntervals.forEach((interval) => clearInterval(interval));
  activeIntervals.clear();
};

/**
 * 更新托盘菜单
 * @param tray Electron 托盘实例
 * @param endpoints 当前监控的 URL 列表
 */
export const updateTrayMenu = (
  tray: Tray | null,
  monitoredUrls: MonitorItem[]
) => {
  if (!tray) return;

  const menu = Menu.buildFromTemplate(
    monitoredUrls.map((monitor) => ({
      label: `${monitor.name} (${monitor.url}) - ${
        monitor.active ? monitor.status : "Inactive"
      } (${monitor.time}ms)`,
      icon:
        monitor.status === "Online"
          ? undefined // 可选：为在线状态添加图标
          : undefined, // 可选：为离线状态添加图标
      click: () => {
        console.log(`Clicked on ${monitor.name}`);
      },
    }))
  );

  tray.setContextMenu(menu);
};