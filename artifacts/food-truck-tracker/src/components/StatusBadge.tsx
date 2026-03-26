import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: "open" | "closing_soon" | "opening_later" | "closed";
  isLive?: boolean;
  className?: string;
}

export function StatusBadge({ status, isLive, className }: StatusBadgeProps) {
  if (isLive) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shadow-sm border border-red-200 dark:border-red-800/50", className)}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
        LIVE NOW
      </div>
    );
  }

  switch (status) {
    case "open":
      return (
        <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50", className)}>
          Open Now
        </div>
      );
    case "closing_soon":
      return (
        <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50", className)}>
          Closing Soon
        </div>
      );
    case "opening_later":
      return (
        <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50", className)}>
          Opening Later
        </div>
      );
    case "closed":
    default:
      return (
        <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700", className)}>
          Closed
        </div>
      );
  }
}
