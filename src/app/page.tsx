import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Root page — redirects to the default (first) landlord's tenant page.
 * In a multi-tenant setup there is no un-scoped guest homepage.
 */
export default async function RootPage() {
  const landlord = await prisma.landlord.findFirst({
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })

  if (!landlord) {
    // No landlords in the database yet — show a bare message
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#3a392a", color: "#f0ebe0", fontFamily: "sans-serif" }}>
        <p>No properties configured yet.</p>
      </div>
    )
  }

  redirect(`/${landlord.slug}`)
}
