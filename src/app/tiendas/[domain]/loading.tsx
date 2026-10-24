import { CardGridSkeleton, PageHeadSkeleton, StatsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-6 sm:px-6" aria-busy>
      <PageHeadSkeleton />
      <StatsSkeleton />
      <div className="mt-8">
        <CardGridSkeleton count={5} />
      </div>
    </div>
  );
}
