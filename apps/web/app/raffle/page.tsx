import type { Metadata } from "next";
import { RafflePage } from "@/components/public/raffle-page";

export const metadata: Metadata = {
  title: "Biggest Trout 50/50 Raffle | Walden Marine x QR Captain",
  description:
    "Enter the Biggest Trout 50/50 Raffle at Safety Harbor Slam 2026. Win half the pot while supporting Cass Walden's missionary aviation training program.",
};

export default function RaffleRoute() {
  return <RafflePage />;
}
