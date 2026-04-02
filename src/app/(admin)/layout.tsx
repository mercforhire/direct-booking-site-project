import { Suspense } from "react"
import { Sidebar } from "@/components/admin/sidebar"
import { requireLandlordsForAdmin } from "@/lib/landlord"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const landlords = await requireLandlordsForAdmin()

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<aside className="w-56 min-h-screen border-r bg-white" />}>
        <Sidebar
          landlords={landlords.map((l) => ({ slug: l.slug, name: l.name }))}
        />
      </Suspense>
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  )
}
