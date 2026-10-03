import Image from "next/image";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { ArrowRight, ShieldCheck, Truck, RotateCcw, BadgeCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/store/section";
import { ProductRail } from "@/components/store/product-rail";
import { ProductCard } from "@/components/store/product-card";
import { Countdown } from "@/components/store/countdown";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { Stars } from "@/components/shared/rating";
import { getBrands, getCategories, getHomeReviews, getHomeSections } from "@/lib/services/catalog";
import { formatDate } from "@/lib/utils";

// Rendered per request (navbar is user-aware); catalog queries are cached via tags in lib/services/catalog.
export const dynamic = "force-dynamic";

const hasHero = existsSync(path.join(process.cwd(), "public", "hero.webp"));

export default async function HomePage() {
  const [sections, categories, brands, reviews] = await Promise.all([getHomeSections(), getCategories(), getBrands(), getHomeReviews()]);
  const flashEnds = sections.flash[0]?.endsAt ?? null;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {/* Grain overlay */}
        <div className="absolute inset-0 -z-10 grain" />

        {/* Hero background image — shown on ALL breakpoints as an absolute fill.
             On desktop: anchored at 70% / 50% (text left, products right).
             On mobile:  anchored at 55% / 25% to centre the headphone cluster
                         and keep the purple glow visible without excessive left-zone crop. */}
        {hasHero && (
          <Image
            src="/hero.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover object-[55%_25%] opacity-90 md:object-[70%_50%]"
          />
        )}

        {/* Left-to-right gradient: protects text on both breakpoints.
             Mobile needs a stronger mid-stop so the busy image doesn't bleed into the text area.
             Desktop keeps the lighter mid-stop from the original design. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-transparent md:via-background/40" />

        {/* Top-down gradient for mobile: darkens the upper text zone against the image.
             Hidden on desktop where the left gradient is sufficient. */}
        <div className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-background/70 to-transparent md:hidden" />

        {/* Bottom fade: blends hero into the next section */}
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />

        {/* Content */}
        <div className="mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-16 md:min-h-[86vh] md:px-6 md:py-24">
          <p className="mb-6 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 text-[12.5px] font-normal leading-normal text-muted hairline sm:text-sm">
            <span className="size-1.5 shrink-0 rounded-full bg-success" /> New: iPhone 17 Pro & AirPods Pro 3 in stock
          </p>
          <h1 className="max-w-[14ch] text-[34px] font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-[44px] md:max-w-3xl md:text-[84px]">
            Technology,
            <br />
            <span className="bg-gradient-to-r from-white via-white to-[#a996ff] bg-clip-text text-transparent">designed differently.</span>
          </h1>
          <p className="mt-5 max-w-xs text-base text-muted md:mt-6 md:max-w-md md:text-lg">Discover products that make everyday life better.</p>
          <div className="mt-7 flex flex-wrap gap-3 md:mt-9">
            <Button asChild size="lg"><Link href="/shop">Explore Collection <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="#trending">View Trending</Link></Button>
          </div>
          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-5 text-sm md:mt-16 md:grid-cols-4 md:gap-6">
            {[
              [Truck, "Free delivery", "On every order"],
              [BadgeCheck, "100% genuine", "Brand warranty"],
              [RotateCcw, "7-day returns", "No questions"],
              [ShieldCheck, "Secure checkout", "UPI · Cards · COD"],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Truck;
              return (
                <div key={t as string} className="flex items-start gap-2.5">
                  <I className="mt-0.5 size-4 text-accent" />
                  <div>
                    <dt className="font-medium">{t as string}</dt>
                    <dd className="text-xs text-muted">{d as string}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <div id="trending" className="scroll-mt-16">
        <Section eyebrow="Right now" title="Trending products" href="/shop?sort=popular">
          <ProductRail products={sections.trending} />
        </Section>
      </div>

      <Section eyebrow="Browse" title="Shop by category" href="/shop" linkLabel="All products">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-card hairline ${i === 0 || i === 3 ? "md:row-span-1" : ""}`}
            >
              <div className="relative aspect-[4/3.4]">
                {c.image && <Image src={c.image} alt="" fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                <div>
                  <h3 className="font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{c.name}</h3>
                  <p className="text-xs text-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{c._count.products} products</p>
                </div>
                <span className="grid size-8 place-items-center rounded-full bg-white/10 opacity-0 transition group-hover:opacity-100"><ArrowRight className="size-4" /></span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {sections.flash.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-[#16122b] via-card to-card p-4 sm:p-6 md:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[320px_1fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[#b3a1ff]"><Zap className="size-3.5" /> Flash Drop</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Up to {Math.max(...sections.flash.map((f) => f.discountPercent))}% off. 48 hours only.</h2>
                <p className="mt-3 text-sm text-muted">Limited stock on flagship audio, laptops and displays. Stack with code <span className="font-mono text-foreground">FLASH15</span> on orders above ₹20,000.</p>
                {flashEnds && <div className="mt-6"><Countdown endsAt={flashEnds} /></div>}
              </div>
              {/* On mobile: horizontal snap-scroll so cards aren't crushed inside the
                   double-padded container. On md+: regular grid. */}
              <div className="no-scrollbar -mx-2 flex snap-x snap-mandatory scroll-px-2 gap-3 overflow-x-auto pb-1 sm:-mx-3 sm:scroll-px-3 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 md:scroll-px-0 xl:grid-cols-4">
                {sections.flash.map((p) => (
                  <div key={p.id} className="w-[70%] shrink-0 snap-start sm:w-[46%] md:w-auto">
                    <ProductCard product={p} />
                  </div>
                ))}
                <div className="w-2 shrink-0 md:hidden" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>
      )}

      <Section eyebrow="Loved by customers" title="Best sellers" href="/shop?sort=popular">
        <ProductRail products={sections.bestSellers} />
      </Section>

      <Section eyebrow="Just landed" title="New arrivals" href="/shop?sort=newest">
        <ProductRail products={sections.newArrivals} />
      </Section>

      <Section eyebrow="Official partner" title="Featured brands" href="/shop" linkLabel="Shop all brands">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-3.5">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/shop?brand=${b.slug}`}
              className="group relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl bg-card px-3.5 py-3 hairline transition duration-300 hover:bg-elevated hover:shadow-[0_0_0_1px_rgb(124_92_252/0.3),0_4px_24px_-4px_rgb(0_0_0/0.4)] sm:min-h-[4.75rem] sm:p-3.5"
              aria-label={`Shop ${b.name} — ${b._count.products} products`}
            >
              {/* Subtle accent glow on hover */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-accent/8 via-transparent to-transparent" />
              <div className="relative flex flex-col items-center gap-1 text-center">
                <span className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent sm:text-lg">
                  {b.name}
                </span>
                <span className="text-xs text-muted">{b._count.products} products</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {reviews.length > 0 && (
        <Section eyebrow="Verified purchases" title="What customers are saying">
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 6).map((r) => (
              <figure key={r.id} className="flex flex-col rounded-2xl bg-card p-6 hairline">
                <Stars value={r.rating} />
                <p className="mt-4 font-medium">&ldquo;{r.title}&rdquo;</p>
                <blockquote className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed text-muted">{r.comment}</blockquote>
                <figcaption className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                  <span><span className="text-foreground">{r.user.name}</span> · <Link href={`/product/${r.product.slug}`} className="text-muted hover:text-foreground">{r.product.name}</Link></span>
                  <span className="text-subtle">{formatDate(r.createdAt, { month: "short", year: "numeric" })}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:px-6">
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-card px-6 py-12 md:px-14 md:py-16">
          <div className="pointer-events-none absolute inset-0 grain opacity-70" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-md">
              <h2 className="text-3xl font-semibold tracking-tight">Be first to the next drop.</h2>
              <p className="mt-2 text-sm text-muted">Early access to launches, flash drops and member-only prices. No spam, unsubscribe anytime.</p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
