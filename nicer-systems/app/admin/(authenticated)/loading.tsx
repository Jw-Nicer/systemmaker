function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[20px] bg-[#d9d1c3]/40 ${className ?? ""}`}
    />
  );
}

export default function AdminDashboardLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 border-b border-[#d9d1c3] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="mt-3 h-12 w-56 rounded-2xl" />
          <Skeleton className="mt-3 h-5 w-80 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>

      {/* Metric cards skeleton */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[28px]" />
        ))}
      </div>

      {/* Analytics skeleton */}
      <div className="mt-10 space-y-4">
        <Skeleton className="h-6 w-24 rounded-md" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[28px]" />
          ))}
        </div>
      </div>

      {/* Recent leads skeleton */}
      <div className="mt-8 space-y-4">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-64 rounded-[28px]" />
      </div>
    </div>
  );
}
