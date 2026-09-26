"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { submitReviewAction } from "@/lib/actions/engagement";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, existing }: { productId: string; existing?: { rating: number; title: string; comment: string; status: string } | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4 rounded-2xl bg-card p-5 hairline"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await submitReviewAction({ productId, rating, title: fd.get("title"), comment: fd.get("comment") });
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            toast.error(r.error);
            return;
          }
          setErrors({});
          toast.success(existing ? "Review updated" : "Thanks! Your review is live.");
          router.refresh();
        });
      }}
    >
      <div>
        <p className="font-medium">{existing ? "Edit your review" : "Write a review"}</p>
        <p className="text-xs text-muted">You purchased this product — your review will carry a Verified Purchase badge.</p>
        {existing?.status === "HIDDEN" && <p className="mt-1 text-xs text-warning">Your previous review was hidden by moderators. Editing will resubmit it.</p>}
      </div>
      <div>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="cursor-pointer p-0.5">
              <Star className={cn("size-6 transition", (hover || rating) >= n ? "fill-[#f5c451] text-[#f5c451]" : "text-white/20")} />
            </button>
          ))}
        </div>
        {errors.rating && <p className="mt-1 text-xs text-danger">{errors.rating}</p>}
      </div>
      <Field label="Title" htmlFor="rv-title" error={errors.title}>
        <Input id="rv-title" name="title" defaultValue={existing?.title} maxLength={100} placeholder="Sum it up in a few words" invalid={!!errors.title} />
      </Field>
      <Field label="Your review" htmlFor="rv-comment" error={errors.comment}>
        <Textarea id="rv-comment" name="comment" rows={4} defaultValue={existing?.comment} maxLength={2000} placeholder="What did you like or dislike? How are you using it?" invalid={!!errors.comment} />
      </Field>
      <Button type="submit" loading={pending}>{existing ? "Update review" : "Submit review"}</Button>
    </form>
  );
}
