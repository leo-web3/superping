import fs from "fs";
import path from "path";
import { app } from "electron";
import { MonitorItem } from "@/types/Monitor";
const userDataPath = app.getPath("userData");

/**
 * 加载数据
 */
export function loadData<T>(filename: string = "monitors"): T {
  const DATA_FILE = path.join(userDataPath, `${filename}.json`);
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(data) as T;
    }
    return undefined;
  } catch (err) {
    console.error("Failed to load data:", err);
    return undefined;
  }
}

/**
 * 保存数据
 */
export function saveData<T>(data: T, filename?: string) {
  if (!filename || typeof filename !== "string") {
    filename = "monitors";
  }
  const DATA_FILE = path.join(userDataPath, `${filename}.json`);
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save data:", err);
  }
}
