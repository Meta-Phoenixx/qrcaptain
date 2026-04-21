import type { Metadata } from "next";
import { DonationPage } from "@/components/public/donation-page";

export const metadata: Metadata = {
  title: "Support Missionary Aviation | Walden Marine x The QR Captain",
  description:
    "Donate to support Cass Walden's missionary aviation training program. Get free VIP access to The QR Captain community.",
};

export default function DonateRoute() {
  return <DonationPage />;
}
