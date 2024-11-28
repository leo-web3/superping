import { ProxyConfig } from "./UserConfig";

export interface SSH {
  port?: number;
  username?: string;
  password?: string
}
export type MonitorStatus = "Online" | "Offline" | 'Inactive';
export type MonitorMethod = "HTTP" | "ICMP";
export interface MonitorItem {
  id?: string;
  active?: boolean;
  status?: MonitorStatus;
  frequency?: number;
  name?: string;
  url?: string;
  latency?: number;
  method?: MonitorMethod;
  error?: string;
  ignoreGlobalProxy?: boolean;
  proxyConfig?: ProxyConfig | undefined;
  ssh?: SSH | undefined,
}
