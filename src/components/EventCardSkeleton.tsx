import { Skeleton } from '@/components/ui/skeleton';

interface EventCardSkeletonProps {
  count?: number;
}

export function EventCardSkeletons({ count = 6 }: EventCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
