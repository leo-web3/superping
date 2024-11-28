import React, { useState, useEffect } from "react";
import { Box, Input, Button, FormControl, FormLabel,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@chakra-ui/react'
import { ProxyConfig } from "@/types/UserConfig";

const Settings = () => {
  const [proxyConfig, setProxyConfig] = useState<ProxyConfig>({
    host: "",
    port: undefined,
    username: "",
    password: "",
  });

  // 加载已保存的代理配置
  useEffect(() => {
    const fetchProxyConfig = async () => {
      if (window.electron?.ipcRenderer?.invoke) {
        const savedConfig = await window.electron.ipcRenderer.invoke(
          "get-proxy-config"
        );
        setProxyConfig(savedConfig || {});
      }
    };
    fetchProxyConfig();
  }, []);

  // 保存代理配置
  const saveProxyConfig = async () => {
    if (window.electron?.ipcRenderer?.invoke) {
      await window.electron.ipcRenderer.invoke("set-proxy-config", proxyConfig);
      alert("Proxy configuration saved successfully!");
    }
  };

  return (
    <Box p={5}>
    <Breadcrumb>
      <BreadcrumbItem>
        <BreadcrumbLink href='/home'>Home</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>
        <BreadcrumbLink>Settings</BreadcrumbLink>
      </BreadcrumbItem>
    </Breadcrumb>
      <Box p={5}>
        <FormControl>
          <FormLabel>Host</FormLabel>
          <Input
            placeholder="Proxy Host"
            value={proxyConfig.host}
            onChange={(e) =>
              setProxyConfig({ ...proxyConfig, host: e.target.value })
            }
          />
        </FormControl>
        <FormControl mt={4}>
          <FormLabel>Port</FormLabel>
          <Input
            type="number"
            placeholder="Proxy Port"
            value={proxyConfig.port || ""}
            onChange={(e) =>
              setProxyConfig({ ...proxyConfig, port: Number(e.target.value) })
            }
          />
        </FormControl>
        <FormControl mt={4}>
          <FormLabel>Username</FormLabel>
          <Input
            placeholder="Username"
            value={proxyConfig.username || ""}
            onChange={(e) =>
              setProxyConfig({ ...proxyConfig, username: e.target.value })
            }
          />
        </FormControl>
        <FormControl mt={4}>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            placeholder="Password"
            value={proxyConfig.password || ""}
            onChange={(e) =>
              setProxyConfig({ ...proxyConfig, password: e.target.value })
            }
          />
        </FormControl>
        <Button mt={6} colorScheme="blue" onClick={saveProxyConfig}>
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
