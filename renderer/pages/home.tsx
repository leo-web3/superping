import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Switch,
  HStack,
  Text,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  IconButton,
} from "@chakra-ui/react";
import { MonitorItem } from "@/types/Monitor";
import { ChevronDownIcon, DeleteIcon } from "@chakra-ui/icons";
import { BsBootstrapReboot } from "react-icons/bs";

const Home = () => {
  const [monitors, setMonitors] = useState<MonitorItem[]>([]);

  // 从主进程获取持久化数据
  useEffect(() => {
    const fetchMonitors = async () => {
      if (window.electron?.ipcRenderer?.invoke) {
        const savedMonitors = await window.electron?.ipcRenderer?.invoke(
          "get-monitors"
        );
        setMonitors(savedMonitors);
      }
    };
    fetchMonitors();
    const handleMonitorUpdate = (
      _event: any,
      updatedMonitors: MonitorItem[]
    ) => {
      setMonitors(updatedMonitors);
    };

    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on("monitor-updated", handleMonitorUpdate);
    }

    return () => {
      // 清理监听器
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeListener(
          "monitor-updated",
          handleMonitorUpdate
        );
      }
    };
  }, []);

  // 切换激活状态
  const toggleActive = async (id: number) => {
    const targetMonitor = monitors.find((monitor) => monitor.id === id);
    if (targetMonitor) {
      const newActiveState = !targetMonitor.active;
      await updateMonitor(id, { active: newActiveState });
    }
  };

  const updateMonitor = async (id: number, updates: Partial<MonitorItem>) => {
    const updatedMonitors = monitors.map((monitor) =>
      monitor.id === id ? { ...monitor, ...updates } : monitor
    );

    setMonitors(updatedMonitors);

    if (window.electron?.ipcRenderer?.invoke) {
      await window.electron.ipcRenderer.invoke("update-monitor", id, updates);
    }
  };

  // 删除监控项
  const deleteMonitor = async (id: number) => {
    const updatedMonitors = monitors.filter((monitor) => monitor.id !== id);
    setMonitors(updatedMonitors);

    if (window.electron?.ipcRenderer?.invoke) {
      await window.electron.ipcRenderer.invoke("delete-monitor", id);
    }
  };

  // 打开 SSH
  const openSSH = (monitorItem: MonitorItem) => {
    if (!monitorItem) return;
    const { username, port } = monitorItem.ssh;
    const command = `ssh ${username}@${monitorItem.url}${port ? ` -p ${port}` : ""}`;
    window.electron?.ipcRenderer?.send("open-terminal", command);
  };

  // 重启服务器
  const restartServer = async (monitor: MonitorItem) => {
    if (!monitor.ssh || !monitor.ssh.username || !monitor.ssh.password) {
      alert("SSH credentials are missing for this monitor.");
      return;
    }

    const sshConfig = {
      host: monitor.url,
      port: monitor.ssh.port,
      username: monitor.ssh.username,
      password: monitor.ssh.password,
    };

    window.electron?.ipcRenderer?.send("execute-ssh-command", sshConfig, 'sudo reboot');
  };


  return (
    <Box p={5}>
      {/* 表格显示监控项 */}
      <Table variant="striped" colorScheme="gray">
        <Thead>
          <Tr>
            <Th>Active</Th>
            <Th>Status</Th>
            <Th>Time (ms)</Th>
            <Th>Name</Th>
            <Th>URL</Th>
            <Th>Method</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {monitors.map((monitor) => (
            <Tr key={monitor.id}>
              <Td>
                <Switch
                  isChecked={monitor.active}
                  onChange={() => toggleActive(monitor.id)}
                />
              </Td>
              <Td>
                <HStack>
                  <Box
                    w={3}
                    h={3}
                    borderRadius="full"
                    bg={monitor.status === "Online" ? "green.500" : "red.500"}
                  />
                  <Text>{monitor.status}</Text>
                </HStack>
              </Td>
              <Td>{monitor.time} ms</Td>
              <Td>{monitor.name}</Td>
              <Td>
                <Text isTruncated maxW="200px">
                  {monitor.url}
                </Text>
              </Td>
              <Td>
                <Badge
                  colorScheme={monitor.method === "HTTP" ? "blue" : "purple"}
                >
                  {monitor.method}
                </Badge>
              </Td>
              <Td>
                {monitor?.ssh?.username && monitor?.ssh.port ? (
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Restart Server"
                      icon={<BsBootstrapReboot />}
                      size="sm"
                      colorScheme="green"
                      onClick={() => restartServer(monitor)}
                    />
                    <Menu>
                      <MenuButton
                        as={Button}
                        size="sm"
                        rightIcon={<ChevronDownIcon />}
                      >
                        More
                      </MenuButton>
                      <MenuList>
                        <MenuItem onClick={() => openSSH(monitor)}>
                          Open SSH
                        </MenuItem>
                      </MenuList>
                    </Menu>
                    <IconButton
                      aria-label="Delete Monitor"
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => deleteMonitor(monitor.id)}
                    />
                  </HStack>
                ) : (
                  <IconButton
                    aria-label="Delete Monitor"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => deleteMonitor(monitor.id)}
                  />
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default Home;