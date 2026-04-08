import { Card, CardContent } from "@/components/ui/card";
import { Package, TrendingUp, BarChart3, Users, LucideIcon } from "lucide-react";

interface StoreStatsProps {
  listingsCount: number;
  activeCount: number;
  totalViews: number;
  followersCount: number;
}

const StoreStats = ({ listingsCount, activeCount, totalViews, followersCount }: StoreStatsProps) => {
  const stats: { label: string; value: number; icon: LucideIcon; color: string }[] = [
    { label: "Elanlar", value: listingsCount, icon: Package, color: "text-primary" },
    { label: "Aktiv", value: activeCount, icon: TrendingUp, color: "text-green-600" },
    { label: "Baxış", value: totalViews, icon: BarChart3, color: "text-blue-600" },
    { label: "Abunəçi", value: followersCount, icon: Users, color: "text-purple-600" },
  ];

  return (
    <div className="mb-6 grid grid-cols-4 gap-2">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex flex-col items-center justify-center p-2.5 text-center">
            <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
            <p className="text-base font-bold text-foreground leading-tight">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StoreStats;
