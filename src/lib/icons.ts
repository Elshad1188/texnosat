import {
  Smartphone, Laptop, Tablet, Headphones, Monitor, Gamepad2,
  Camera, Watch, Cpu, Printer, Wifi, CircuitBoard,
  Speaker, Battery, Usb, HardDrive, Mouse, Keyboard,
  type LucideIcon,
} from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  Smartphone, Laptop, Tablet, Headphones, Monitor, Gamepad2,
  Camera, Watch, Cpu, Printer, Wifi, CircuitBoard,
  Speaker, Battery, Usb, HardDrive, Mouse, Keyboard,
};

export const availableIconNames = Object.keys(iconMap);
