import { Sidebar } from "@/components/admin/sidebar"
import { requireLandlordForAdmin } from "@/lib/landlord"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const landlord = await requireLandlordForAdmin()

  return (
    <div className="flex min-h-screen">
      <Sidebar landlordName={landlord.name} />
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  )
}
