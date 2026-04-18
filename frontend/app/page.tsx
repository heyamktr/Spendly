import { DashboardPage } from "@/components/dashboard-page";
import { getApiBaseUrl } from "@/lib/api";

export default function HomePage() {
  return <DashboardPage apiBaseUrl={getApiBaseUrl()} />;
}
