import { RowsSkeleton, StatsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6 sm:px-6" aria-busy>
      <div className="mt-10 flex flex-col items-center gap-3" aria-hidden>
        <div className="size-16 animate-pulse rounded-full bg-stone-200/70" />
        <div className="h-4 w-48 animate-pulse rounded-lg bg-stone-200/70" />
      </div>
      <StatsSkeleton count={4} />
      <RowsSkeleton rows={4} />
    </div>
  );
}
