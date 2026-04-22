import { 
  Flame, 
  Heart, 
  Shield, 
  Droplet, 
  Wind, 
  Zap, 
  AlertCircle, 
  Info 
} from "lucide-react";
import type { IncidentCategory, IncidentSeverity } from "@workspace/api-client-react";

export function getSeverityColors(severity: IncidentSeverity | string) {
  switch (severity) {
    case "Critical":
      return "bg-destructive text-destructive-foreground border-destructive";
    case "High":
      return "bg-orange-500 text-white border-orange-600";
    case "Medium":
      return "bg-yellow-500 text-white border-yellow-600";
    case "Low":
      return "bg-blue-500 text-white border-blue-600";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getCategoryIcon(category: IncidentCategory | string) {
  switch (category) {
    case "Fire": return Flame;
    case "Medical": return Heart;
    case "Security": return Shield;
    case "Flood": return Droplet;
    case "Gas Leak": return Wind;
    case "Electrical": return Zap;
    case "Other": return AlertCircle;
    default: return Info;
  }
}
