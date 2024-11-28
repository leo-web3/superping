import React, { useState, useEffect } from "react";
import { Flex, Box, Button, IconButton,   Input,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Checkbox,
  VStack, } from "@chakra-ui/react";
import { FaTimes, FaMinus, FaSquare, FaCog, FaPlus } from "react-icons/fa";
import Router from "next/router";
import { useForm, Controller } from "react-hook-form";
import { MonitorItem, SSH, MonitorStatus, MonitorMethod } from "@/types/Monitor";
import { ProxyConfig } from "@/types/UserConfig";
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const defaultProxyConfig: ProxyConfig = {
  host: "",
  port: undefined,
  username: "",
  password: "",
};
const defaultSSH: SSH = {
  port: 22,
  username: "",
  password: "",
};
const schema = yup.object().shape({
  id: yup.string().required("ID is required"),
  active: yup.boolean().required("Active status is required"),
  status: yup
    .mixed<MonitorStatus>()
    .oneOf(["Online", "Offline", "Inactive"], "Status must be 'Online', 'Offline', or 'Inactive'")
    .required(),
  frequency: yup.number().positive("Frequency must be positive").required(),
  name: yup.string().required("Name is required"),
  url: yup.string().required("URL is required"),
  latency: yup.number().min(0, "Latency must be zero or positive").required(),
  method: yup
    .mixed<MonitorMethod>()
    .oneOf(["HTTP", "ICMP"], "Method must be 'HTTP' or 'ICMP'")
    .required(),
  error: yup.string().optional(),
  ignoreGlobalProxy: yup.boolean().required(),
  proxyConfig: yup
    .object()
    .nullable() // 允许为空值
    .transform((value, originalValue) => {
      // 如果字段值为 undefined 或者是空对象，将其转换为 null
      return originalValue && Object.keys(originalValue).length > 0 ? originalValue : undefined;
    })
    .shape({
      host: yup.string().nullable(),
      port: yup.number().nullable(),
      username: yup.string().nullable(),
      password: yup.string().nullable(),
    }),
  ssh: yup
    .object()
    .nullable() // 允许为空值
    .transform((value, originalValue) => {
      // 如果字段值为 undefined 或者是空对象，将其转换为 null
      return originalValue && Object.keys(originalValue).length > 0 ? originalValue : undefined;
    })
    .shape({
      username: yup.string().nullable(),
      port: yup.number().nullable(),
      password: yup.string().nullable(),
    }),
});
export function MonitorEditorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { control, handleSubmit, watch, reset, setValue,getValues,  formState: { errors } } = useForm<MonitorItem>({
    defaultValues: {
      id: Date.now().toString(), // id and is createTime
      active: true, // Default to active
      status: "Offline", // Initial status
      frequency: 60000,
      name: "",
      url: "",
      latency: 0, // Initial latency
      method: "HTTP",
      error: undefined, // Optional error flag
      ignoreGlobalProxy: false,
      proxyConfig: undefined,
      ssh: undefined,
    },
    mode: "onBlur",
    resolver: yupResolver(schema), // 使用 Yup 验证规则
  });
  
  const onSubmit = async (data: MonitorItem, errors: any) => {
    if (window.electron?.ipcRenderer?.invoke) {
      if (Object.keys(data.ssh).length === 0) {
        delete data.ssh
      }
      if (Object.keys(data.proxyConfig).length === 0) {
        delete data.proxyConfig
      }
      await window.electron.ipcRenderer.invoke("add-monitor", data);
    }
    onClose();
    reset(); // 重置表单
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Monitor</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter name for identification" />
                )}
              />
            </FormControl>
            <FormControl>
              <FormLabel>URL</FormLabel>
              <Controller
                name="url"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter URL" />
                )}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Method</FormLabel>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <Select {...field}>
                    <option value="HTTP">HTTP</option>
                    <option value="ICMP">ICMP</option>
                  </Select>
                )}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Frequency (ms)</FormLabel>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <Input type="number" {...field} placeholder="Frequency in milliseconds" />
                )}
              />
            </FormControl>
            <Controller
              name="ignoreGlobalProxy"
              control={control}
              render={({ field }) => (
                <Checkbox
                  isChecked={watch("ignoreGlobalProxy")} // 使用 react-hook-form 的 watch 方法
                  onChange={(e) => setValue("ignoreGlobalProxy", e.target.checked)} // 更新 react-hook-form 的值
                  name="ignoreGlobalProxy"
                >
                  Ignore Global Proxy
                </Checkbox>
              )}
            />
            <Checkbox
              isChecked={!!watch("proxyConfig")} // 使用 react-hook-form 的 watch 方法
              onChange={(e) => setValue("proxyConfig", e.target.checked ? defaultProxyConfig : undefined)} // 更新 react-hook-form 的值
            >
              Use Custom Proxy
            </Checkbox>
            {!!watch("proxyConfig") && (
              <VStack spacing={2} align="stretch">
                <FormControl>
                  <FormLabel>Proxy Host</FormLabel>
                  <Controller
                    name="proxyConfig.host"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} placeholder="Proxy Host" />
                    )}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Proxy Port</FormLabel>
                  <Controller
                    name="proxyConfig.port"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        {...field}
                        placeholder="Proxy Port"
                      />
                    )}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Username</FormLabel>
                  <Controller
                    name="proxyConfig.username"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} placeholder="Proxy Username" />
                    )}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Controller
                    name="proxyConfig.password"
                    control={control}
                    render={({ field }) => (
                      <Input type="password" {...field} placeholder="Proxy Password" />
                    )}
                  />
                </FormControl>
              </VStack>
            )}
            <Checkbox
              isChecked={!!watch("ssh")} // 使用 react-hook-form 的 watch 方法
              onChange={(e) => setValue("ssh", e.target.checked ? defaultSSH : undefined)} // 更新 react-hook-form 的值

            >
              Use SSH
            </Checkbox>
            {!!watch("ssh") && (
              <VStack spacing={2} align="stretch">
                <FormControl>
                  <FormLabel>SSH Username</FormLabel>
                  <Controller
                    name="ssh.username"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} placeholder="SSH Username" />
                    )}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>SSH Password</FormLabel>
                  <Controller
                    name="ssh.password"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="password"
                        {...field}
                        placeholder="SSH Password"
                      />
                    )}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>SSH Port</FormLabel>
                  <Controller
                    name="ssh.port"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        {...field}
                        placeholder="SSH Port"
                      />
                    )}
                  />
                </FormControl>
              </VStack>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleSubmit(onSubmit)}>
            Add
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
const CustomTitleBar: React.FC = () => {
  const [isMac, setIsMac] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();


  useEffect(() => {
    // 在客户端检测平台
    setIsMac(navigator.userAgent.includes("Macintosh"));
  }, []);

  const handleClose = () => {
    window.electron.ipcRenderer.send("window-close");
  };

  const handleMinimize = () => {
    window.electron.ipcRenderer.send("window-minimize");
  };

  const handleMaximize = () => {
    window.electron.ipcRenderer.send("window-maximize");
  };

  return (
   <>
    <Flex
      h={isMac ? "28px" : "32px"} // macOS 比 Windows 高度稍微矮一点
      bg={isMac ? "rgba(240, 240, 240, 0.8)" : "gray.800"} // macOS 浅灰，Windows 深灰
      color={isMac ? "black" : "white"} // macOS 黑色文字，Windows 白色文字
      align="center"
      px={isMac ? 2 : 3}
      justify="space-between"
      userSelect="none"
      style={{ WebkitAppRegion: "drag" }} // 整个区域支持拖动
    >
      {/* 左侧 - 系统控制按钮 */}
      {isMac && (
        <Flex gap={4} style={{ WebkitAppRegion: "no-drag" }}>
          <Box
            w="12px"
            h="12px"
            borderRadius="50%"
            bg="red.500"
            _hover={{ bg: "red.600" }}
            style={{ cursor: "pointer" }}
            onClick={handleClose}
          />
          <Box
            w="12px"
            h="12px"
            borderRadius="50%"
            bg="yellow.500"
            _hover={{ bg: "yellow.600" }}
            style={{ cursor: "pointer" }}
            onClick={handleMinimize}
          />
          <Box
            w="12px"
            h="12px"
            borderRadius="50%"
            bg="green.500"
            _hover={{ bg: "green.600" }}
            style={{ cursor: "pointer" }}
            onClick={handleMaximize}
          />
        </Flex>
      )}

      {/* 右侧 - 自定义按钮 */}
      <Flex gap={2} style={{ WebkitAppRegion: "no-drag" }}>
        <Button
          size="sm"
          leftIcon={<FaPlus />}
          variant="ghost"
          colorScheme={isMac ? "blue" : "whiteAlpha"}
          onClick={onOpen}
        >
          Add Monitor
        </Button>
        <Button
          size="sm"
          leftIcon={<FaCog />}
          variant="ghost"
          colorScheme={isMac ? "teal" : "whiteAlpha"}
          onClick={() => Router.push("/settings")}
        >
          Settings
        </Button>
      </Flex>

      {/* Windows 左侧 - 系统控制按钮 */}
      {!isMac && (
        <Flex gap={2} style={{ WebkitAppRegion: "no-drag" }}>
          <IconButton
            aria-label="Minimize"
            icon={<FaMinus />}
            size="sm"
            variant="ghost"
            color="white"
            onClick={handleMinimize}
          />
          <IconButton
            aria-label="Maximize"
            icon={<FaSquare />}
            size="sm"
            variant="ghost"
            color="white"
            onClick={handleMaximize}
          />
          <IconButton
            aria-label="Close"
            icon={<FaTimes />}
            size="sm"
            variant="ghost"
            color="white"
            _hover={{ bg: "red.600" }}
            onClick={handleClose}
          />
        </Flex>
      )}
    </Flex>
    <MonitorEditorModal isOpen={isOpen} onClose={onClose} /></>
  );
};

export default CustomTitleBar;