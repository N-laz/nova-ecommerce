"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteReviewAction } from "@/lib/actions/engagement";

export function DeleteReviewButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" className="text-danger" loading={pending} onClick={() => confirm("Delete this review?") && start(async () => {
      const r = await deleteReviewAction(id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Review deleted");
      router.refresh();
    })}>
      <Trash2 /> Delete
    </Button>
  );
}
