import { PageHeadSkeleton, RowsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6 sm:px-6" aria-busy>
      <PageHeadSkeleton />
      <div className="mt-5 h-32 animate-pulse rounded-2xl border border-line bg-surface" aria-hidden />
      <RowsSkeleton rows={3} />
    </div>
  );
}
