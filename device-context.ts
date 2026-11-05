import { createContext, useContext } from "react";
import { DEVICES, type DeviceSpec } from "./devices";

export const DeviceCtx = createContext<DeviceSpec>(DEVICES[0]);
export const useSpec = () => useContext(DeviceCtx);
