import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { format, subDays } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Eye, Heart, Star, CalendarCheck, TrendingUp, TrendingDown, Minus,
  BarChart2, Loader2, ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

interface Analytics {
  truckName: string | null;
  totalViews: number;
  views30d: number;
  views7d: number;
  viewsByDay: { date: string; views: number }[];
  favoriteCount: number;
  reviewCount: number;
  avgRating: number | null;
  reservationCount: number;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  trend,
  color = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "flat";
  color?: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
        {trend === "flat" && <Minus className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-foreground">{payload[0].value} view{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

export default function VendorAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    if (!user) return;
    fetch(getApiUrl("/api/vendor/analytics"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setAnalytics(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const chartData = analytics?.viewsByDay.slice(-(range)) ?? [];
  const formattedChart = chartData.map(d => ({
    date: format(new Date(d.date + "T12:00:00"), range === 30 ? "MMM d" : "EEE d"),
    views: d.views,
  }));

  const prev7 = analytics?.viewsByDay.slice(-14, -7).reduce((s, d) => s + d.views, 0) ?? 0;
  const curr7 = analytics?.views7d ?? 0;
  const weekTrend: "up" | "down" | "flat" = curr7 > prev7 ? "up" : curr7 < prev7 ? "down" : "flat";

  const totalChartViews = chartData.reduce((s, d) => s + d.views, 0);
  const peakDay = chartData.reduce((max, d) => d.views > (max?.views ?? 0) ? d : max, chartData[0]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/vendor/dashboard">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium">Analytics</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            {analytics?.truckName && (
              <p className="text-sm text-muted-foreground">{analytics.truckName}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Eye className="w-5 h-5" />}
                label="Views this month"
                value={analytics?.views30d ?? 0}
                sub="Unique profile visits (30d)"
                trend={analytics && analytics.views30d > 0 ? "up" : "flat"}
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Views this week"
                value={analytics?.views7d ?? 0}
                sub="Last 7 days"
                trend={weekTrend}
              />
              <StatCard
                icon={<Eye className="w-5 h-5" />}
                label="All-time views"
                value={analytics?.totalViews ?? 0}
                sub="Total profile visits"
              />
              <StatCard
                icon={<Heart className="w-5 h-5" />}
                label="Favorites"
                value={analytics?.favoriteCount ?? 0}
                sub="Times saved by customers"
                color="text-rose-500"
              />
              <StatCard
                icon={<Star className="w-5 h-5" />}
                label="Avg rating"
                value={analytics?.avgRating != null ? analytics.avgRating.toFixed(1) : "—"}
                sub={analytics?.reviewCount ? `From ${analytics.reviewCount} review${analytics.reviewCount !== 1 ? "s" : ""}` : "No reviews yet"}
                color="text-amber-500"
              />
              <StatCard
                icon={<CalendarCheck className="w-5 h-5" />}
                label="Booking requests"
                value={analytics?.reservationCount ?? 0}
                sub="Event catering inquiries"
              />
            </div>

            <div className="bg-card border border-card-border rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">Profile Views</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {totalChartViews} view{totalChartViews !== 1 ? "s" : ""} in the last {range} days
                    {peakDay && peakDay.views > 0 && (
                      <> · Peak: <span className="text-foreground font-medium">{peakDay.views}</span> on {format(new Date(peakDay.date + "T12:00:00"), "MMM d")}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  {([7, 14, 30] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {r}d
                    </button>
                  ))}
                </div>
              </div>

              {totalChartViews === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Eye className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-foreground font-medium mb-1">No views yet</p>
                  <p className="text-sm text-muted-foreground">Views will appear here once customers visit your truck profile.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={formattedChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      interval={range === 7 ? 0 : range === 14 ? 1 : 4}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#viewsGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-muted/40 border border-dashed border-border rounded-2xl p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How views are counted</p>
              <p>Each unique browser session counts as one view per truck profile. Refreshing the page or returning later in the same session doesn't add extra views.</p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
