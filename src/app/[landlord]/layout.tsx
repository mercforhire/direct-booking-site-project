import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Bebas_Neue, DM_Sans } from "next/font/google"
import { getLandlordBySlug } from "@/lib/landlord"

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
})

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ landlord: string }>
}): Promise<Metadata> {
  const { landlord: slug } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) return {}
  return {
    title: `${landlord.name} — Direct Booking`,
    description: `Book directly with ${landlord.ownerName} at ${landlord.name}. No Airbnb fees.`,
  }
}

export default async function LandlordLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) notFound()

  return (
    <div
      className={`${bebas.variable} ${dm.variable}`}
      style={{
        ["--ll-bg" as string]: landlord.bgColor,
        ["--ll-text" as string]: landlord.textColor,
        ["--ll-accent" as string]: landlord.accentColor,
        background: landlord.bgColor,
        minHeight: "100vh",
        color: landlord.textColor,
        fontFamily: "var(--font-dm), sans-serif",
      }}
    >
      <style>{`
        /* ── Shared animations ────────────────────────── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }

        /* ── Shared interactive states ────────────────── */
        .back-link:hover { opacity: 1 !important; }
        .my-bookings-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .brown-btn:hover { background: #6a3214 !important; }
        .ghost-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .nav-link:hover { opacity: 0.7 !important; }

        /* ── Shared responsive nav ────────────────────── */
        @media (max-width: 600px) {
          .nav-pad { padding: 1.2rem 1.5rem !important; }
        }
      `}</style>
      {children}
    </div>
  )
}
