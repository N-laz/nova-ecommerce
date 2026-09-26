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
        <div className="absolute inset-0 -z-10 grain" />
        {hasHero && (
          <Image src="/hero.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-[70%_50%] opacity-90" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-transparent md:via-background/40" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />
        <div className="mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center px-4 py-24 md:min-h-[86vh] md:px-6">
          <p className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-muted hairline">
            <span className="size-1.5 rounded-full bg-success" /> New: iPhone 17 Pro & AirPods Pro 3 in stock
          </p>
          <h1 className="max-w-3xl text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl md:text-[84px]">
            Technology,
            <br />
            <span className="bg-gradient-to-r from-white via-white to-[#a996ff] bg-clip-text text-transparent">designed differently.</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-muted md:text-lg">Discover products that make everyday life better.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/shop">Explore Collection <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="#trending">View Trending</Link></Button>
          </div>
          <dl className="mt-16 grid max-w-2xl grid-cols-2 gap-6 text-sm md:grid-cols-4">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                <div>
                  <h3 className="font-medium">{c.name}</h3>
                  <p className="text-xs text-muted">{c._count.products} products</p>
                </div>
                <span className="grid size-8 place-items-center rounded-full bg-white/10 opacity-0 transition group-hover:opacity-100"><ArrowRight className="size-4" /></span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {sections.flash.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-[#16122b] via-card to-card p-6 md:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[320px_1fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[#b3a1ff]"><Zap className="size-3.5" /> Flash Drop</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Up to {Math.max(...sections.flash.map((f) => f.discountPercent))}% off. 48 hours only.</h2>
                <p className="mt-3 text-sm text-muted">Limited stock on flagship audio, laptops and displays. Stack with code <span className="font-mono text-foreground">FLASH15</span> on orders above ₹20,000.</p>
                {flashEnds && <div className="mt-6"><Countdown endsAt={flashEnds} /></div>}
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
                {sections.flash.map((p) => <ProductCard key={p.id} product={p} />)}
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
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((b) => (
            <Link key={b.id} href={`/shop?brand=${b.slug}`} className="group flex h-24 flex-col items-center justify-center bg-background transition hover:bg-card">
              <span className="text-lg font-semibold tracking-tight text-foreground/70 transition group-hover:text-foreground">{b.name}</span>
              <span className="mt-1 text-[11px] text-subtle">{b._count.products} products</span>
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
