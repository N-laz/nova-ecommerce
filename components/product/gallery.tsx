"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const img = images[active];
  if (!img) return <div className="grid aspect-square place-items-center rounded-3xl bg-card text-muted hairline">No image available</div>;

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <div className="no-scrollbar flex gap-2 overflow-x-auto md:flex-col" role="tablist" aria-label="Product images">
        {images.map((im, i) => (
          <button
            key={im.url}
            role="tab"
            aria-selected={i === active}
            aria-label={`Image ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn("relative size-16 shrink-0 overflow-hidden rounded-xl bg-card transition md:size-20 cursor-pointer", i === active ? "ring-2 ring-accent" : "opacity-60 hairline hover:opacity-100")}
          >
            <Image src={im.url} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
      <div
        className="relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-3xl bg-card hairline"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <Image
          src={img.url}
          alt={img.alt ?? name}
          fill
          priority
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-200 ease-out"
          style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur">
          {active + 1} / {images.length}
        </span>
      </div>
    </div>
  );
}
