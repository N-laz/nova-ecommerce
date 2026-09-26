export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
      <div className="skeleton mb-8 h-10 w-32" />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28" />)}</div>
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}
