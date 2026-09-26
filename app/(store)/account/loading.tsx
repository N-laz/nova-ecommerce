export default function Loading() {
  return <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>;
}
