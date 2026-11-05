/**
 * Skeleton para bloques que esperan un endpoint (patrón PortPax).
 * El layout real vive en un *Skeleton colocado o en WmsTableSkeleton.
 */
export default function Skeleton({ className = "", style }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/90 dark:bg-slate-700/50 ${className}`}
      style={style}
      aria-hidden
    />
  );
}

export function SkeletonText({ className = "", lines = 1 }) {
  if (lines <= 1) {
    return <Skeleton className={`h-4 max-w-48 ${className}`} />;
  }
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? "max-w-32" : "max-w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ className = "" }) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

export { Skeleton as SkeletonLoader };
