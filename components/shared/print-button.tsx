"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-full bg-black px-4 py-2 text-sm text-white print:hidden cursor-pointer">Print / Save as PDF</button>;
}
