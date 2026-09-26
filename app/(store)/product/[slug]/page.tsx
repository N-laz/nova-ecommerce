import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BadgeCheck, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { RECENT_COOKIE } from "@/lib/auth/constants";
import { getCardsByIds, getProductBySlug, getRelatedProducts, getReviewsForProduct } from "@/lib/services/catalog";
import { hasPurchased } from "@/lib/services/review";
import { MAX_QTY_PER_LINE } from "@/lib/services/cart";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ReviewForm } from "@/components/product/review-form";
import { ViewTracker } from "@/components/product/view-tracker";
import { ProductRail } from "@/components/store/product-rail";
import { Section } from "@/components/store/section";
import { Price } from "@/components/shared/price";
import { Stars } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { absoluteUrl, formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const img = p.images[0]?.url;
  return {
    title: `${p.name} — ${p.brand.name}`,
    description: p.tagline ?? p.description.slice(0, 155),
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description: p.tagline ?? undefined, images: img ? [{ url: img, width: 1000, height: 1000, alt: p.name }] : undefined, type: "website" },
  };
}

function deliveryWindow() {
  const d = new Date();
  d.setDate(d.getDate() + 4);
  return `Delivery by ${formatDate(d, { weekday: "short", day: "numeric", month: "short" })}`;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  const recentIds = ((await cookies()).get(RECENT_COOKIE)?.value ?? "").split(".").filter((id) => id && id !== product.id).slice(0, 8);
  const [{ reviews, distribution }, related, recent, purchased, myReview, alert] = await Promise.all([
    getReviewsForProduct(product.id),
    getRelatedProducts(product.id, product.category.id, product.brand.name),
    getCardsByIds(recentIds),
    user ? hasPurchased(user.id, product.id) : Promise.resolve(false),
    user ? db.review.findUnique({ where: { userId_productId: { userId: user.id, productId: product.id } }, select: { rating: true, title: true, comment: true, status: true } }) : Promise.resolve(null),
    user ? db.stockAlert.findUnique({ where: { userId_productId: { userId: user.id, productId: product.id } }, select: { notifiedAt: true } }) : Promise.resolve(null),
  ]);

  const rating = Number(product.ratingAvg);
  const groups = product.specifications.reduce<Record<string, typeof product.specifications>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((i) => absoluteUrl(i.url)),
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand.name },
    ...(product.ratingCount > 0 && { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: product.ratingCount } }),
    offers: { "@type": "Offer", priceCurrency: "INR", price: product.price.toString(), availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: absoluteUrl(`/product/${product.slug}`) },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ViewTracker productId={product.id} />
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-1 text-xs text-muted">
          <Link href="/" className="hover:text-foreground">Home</Link> /
          <Link href="/shop" className="hover:text-foreground">Shop</Link> /
          <Link href={`/shop?category=${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link> /
          <span className="text-foreground/80">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt }))} name={product.name} />

          <div className="lg:sticky lg:top-20 lg:self-start">
            <Link href={`/shop?brand=${product.brand.slug}`} className="text-sm text-accent hover:underline">{product.brand.name}</Link>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance md:text-4xl">{product.name}</h1>
            {product.tagline && <p className="mt-2 text-muted">{product.tagline}</p>}
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm">
              <Stars value={rating} />
              <span className="tabular">{product.ratingCount ? rating.toFixed(1) : "No ratings yet"}</span>
              {product.ratingCount > 0 && <span className="text-muted">({product.ratingCount} reviews)</span>}
            </a>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {product.isFlashDrop && product.flashDropEndsAt && product.flashDropEndsAt > new Date() && <Badge variant="accent">Flash Drop</Badge>}
              {product.trending && <Badge>Trending</Badge>}
              <span className="text-xs text-subtle">SKU {product.sku}</span>
            </div>
            <div className="mt-5">
              <Price price={product.price.toString()} compareAt={product.compareAtPrice?.toString()} discount={product.discountPercent} size="lg" />
              <p className="mt-1 text-xs text-muted">Inclusive of all taxes (GST)</p>
            </div>
            <div className="mt-7">
              <PurchasePanel
                productId={product.id}
                colors={product.colors}
                stock={product.stock}
                lowStockThreshold={product.lowStockThreshold}
                maxQty={MAX_QTY_PER_LINE}
                deliveryLabel={deliveryWindow()}
                alertActive={!!alert && !alert.notifiedAt}
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="description" className="mt-16">
          <TabsList className="no-scrollbar overflow-x-auto">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="warranty">Warranty</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="max-w-3xl">
            <p className="whitespace-pre-line leading-relaxed text-foreground/85">{product.description}</p>
            {product.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {product.tags.map((t) => <Link key={t} href={`/shop?tag=${encodeURIComponent(t)}`} className="rounded-full px-3 py-1 text-xs text-muted hairline hover:text-foreground">#{t}</Link>)}
              </div>
            )}
          </TabsContent>
          <TabsContent value="specs">
            {Object.keys(groups).length === 0 ? (
              <p className="text-sm text-muted">Specifications haven&apos;t been added for this product yet.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(groups).map(([g, specs]) => (
                  <div key={g} className="overflow-hidden rounded-2xl hairline">
                    <h3 className="bg-card px-5 py-3 text-sm font-medium">{g}</h3>
                    <dl className="divide-y divide-border">
                      {specs.map((s) => (
                        <div key={s.id} className="grid grid-cols-[40%_1fr] gap-4 px-5 py-3 text-sm">
                          <dt className="text-muted">{s.key}</dt>
                          <dd>{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="shipping" className="max-w-3xl space-y-3 text-sm leading-relaxed text-foreground/85">
            <p><strong className="text-foreground">Standard delivery (free):</strong> 3–5 business days across India. Metro cities usually receive orders within 3 days.</p>
            <p><strong className="text-foreground">Express delivery (₹99):</strong> 1–2 business days to serviceable pincodes. Orders placed before 2 PM ship the same day.</p>
            <p>Every package is sealed, insured and requires OTP verification on delivery. Track your order in real time from your account.</p>
          </TabsContent>
          <TabsContent value="warranty" className="max-w-3xl space-y-3 text-sm leading-relaxed text-foreground/85">
            <p><strong className="text-foreground">{product.warranty ?? "1 year manufacturer warranty"}.</strong> NOVA is an authorised reseller — your invoice is valid at every official {product.brand.name} service centre.</p>
            <p>7-day replacement for manufacturing defects or damage in transit. Raise a request from your order page and we&apos;ll arrange a free pickup.</p>
          </TabsContent>
        </Tabs>

        <section id="reviews" className="mt-16 scroll-mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Ratings & reviews</h2>
          <div className="mt-6 grid gap-10 lg:grid-cols-[300px_1fr]">
            <div className="space-y-5">
              <div className="rounded-2xl bg-card p-5 hairline">
                <p className="text-5xl font-semibold tabular">{product.ratingCount ? rating.toFixed(1) : "–"}</p>
                <Stars value={rating} className="mt-2" />
                <p className="mt-1 text-xs text-muted">Based on {product.ratingCount} verified {product.ratingCount === 1 ? "review" : "reviews"}</p>
                <div className="mt-5 space-y-1.5">
                  {distribution.map((d) => {
                    const pct = product.ratingCount ? (d.count / product.ratingCount) * 100 : 0;
                    return (
                      <div key={d.rating} className="flex items-center gap-2 text-xs">
                        <span className="w-3 tabular text-muted">{d.rating}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[#f5c451]" style={{ width: `${pct}%` }} /></div>
                        <span className="w-6 text-right tabular text-subtle">{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {purchased ? (
                <ReviewForm productId={product.id} existing={myReview} />
              ) : (
                <p className="rounded-2xl p-4 text-xs leading-relaxed text-muted hairline">
                  Only customers who have received this product can review it — so every review here is from a verified purchase.
                  {!user && <> <Link href={`/login?next=/product/${product.slug}`} className="text-foreground underline">Sign in</Link> if you&apos;ve bought it.</>}
                </p>
              )}
            </div>
            <div>
              {reviews.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl py-14 text-center hairline">
                  <MessageSquare className="size-6 text-muted" />
                  <p className="mt-3 font-medium">No reviews yet</p>
                  <p className="text-sm text-muted">Be the first verified buyer to share your experience.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {reviews.map((r) => (
                    <li key={r.id} className="py-5 first:pt-0">
                      <div className="flex items-center gap-3">
                        <Stars value={r.rating} />
                        <p className="font-medium">{r.title}</p>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{r.comment}</p>
                      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="text-foreground/80">{r.user.name}</span> · {formatDate(r.createdAt)}
                        {r.verifiedPurchase && <span className="inline-flex items-center gap-1 text-success"><BadgeCheck className="size-3.5" /> Verified Purchase</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <Section title="You may also like" href={`/shop?category=${product.category.slug}`}>
          <ProductRail products={related} />
        </Section>
      )}
      {recent.length > 0 && (
        <Section title="Recently viewed" className="pt-0">
          <ProductRail products={recent.slice(0, 4)} />
        </Section>
      )}
    </>
  );
}
