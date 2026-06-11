import { Laptop, Monitor, MonitorSmartphone, Smartphone, Tablet } from "lucide-react";
import type { DeviceKind } from "@/lib/types";

const MAP: Record<DeviceKind, typeof Smartphone> = {
  mobile: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  unknown: MonitorSmartphone,
};

export function DeviceIcon({
  kind,
  className = "size-4",
}: {
  kind: DeviceKind;
  className?: string;
}) {
  const Icon = MAP[kind] ?? MonitorSmartphone;
  return <Icon className={className} />;
}

export function deviceLabel(kind: DeviceKind): string {
  switch (kind) {
    case "mobile":
      return "Phone";
    case "tablet":
      return "Tablet";
    case "laptop":
      return "Laptop";
    case "desktop":
      return "Desktop";
    default:
      return "Device";
  }
}
