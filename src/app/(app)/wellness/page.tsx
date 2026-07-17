import { redirect } from "next/navigation";

/** The wellness hub currently has one product: Saelis Her. No duplicate nav. */
export default function WellnessPage() {
  redirect("/wellness/her");
}
