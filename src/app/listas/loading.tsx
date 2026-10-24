import { PageHeadSkeleton, RowsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6" aria-busy>
      <PageHeadSkeleton />
      <RowsSkeleton rows={5} />
    </div>
  );
}
