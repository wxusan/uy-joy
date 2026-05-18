import { revalidateTag } from "next/cache";

/**
 * Invalidate every public-facing cache slice that belongs to a project.
 *
 * Call this at the end of any successful mutation in the admin area
 * (projects, buildings, floors, units, hero-images, FAQs) so the public
 * site reflects the change within the next request instead of waiting
 * up to 60 seconds for ISR revalidation.
 */
export function invalidateProject(): void {
  revalidateTag("project");
  revalidateTag("hero-images");
}
