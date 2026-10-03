import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const COLS = [
  { title: "Shop", links: [["All products", "/shop"], ["Smartphones", "/shop?category=smartphones"], ["Laptops", "/shop?category=laptops"], ["Audio", "/shop?category=audio"], ["Wearables", "/shop?category=wearables"]] },
  { title: "Account", links: [["My account", "/account"], ["Orders", "/account/orders"], ["Wishlist", "/wishlist"], ["NOVA Rewards", "/account/rewards"], ["Compare", "/compare"]] },
  { title: "Help", links: [["Shipping & delivery", "/help#shipping"], ["Returns & warranty", "/help#returns"], ["Payments", "/help#payments"], ["Contact us", "/help#contact"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted text-pretty">Premium technology, carefully chosen. Genuine products, GST invoice on every order, and free standard delivery across India.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-xs uppercase tracking-[0.16em] text-subtle">{c.title}</p>
            <ul className="mt-2 space-y-0.5 md:mt-4 md:space-y-1">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-[44px] items-center text-sm text-muted transition hover:text-foreground md:min-h-0 md:py-1.5 focus-visible:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-subtle md:flex-row md:px-6">
          <p>© {new Date().getFullYear()} NOVA Technologies Pvt. Ltd. All prices include GST.</p>
          <p>Demo store — payments run in test mode.</p>
        </div>
      </div>
    </footer>
  );
}
