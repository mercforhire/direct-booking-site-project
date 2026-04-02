import { prisma } from "@/lib/prisma"
import { requireLandlordsWithSelected } from "@/lib/landlord"
import { SettingsForm } from "@/components/forms/settings-form"
import { LandlordEditForm } from "@/components/forms/landlord-edit-form"

export const dynamic = "force-dynamic"

interface SettingsPageProps {
  searchParams: Promise<{ landlord?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { landlord: landlordSlug } = await searchParams
  const { selected } = await requireLandlordsWithSelected(landlordSlug)

  const settings = await prisma.settings.findUnique({ where: { landlordId: selected.id } })
  const settingsDefaults = settings
    ? {
        serviceFeePercent: Number(settings.serviceFeePercent),
        depositAmount: Number(settings.depositAmount),
        etransferEmail: settings.etransferEmail ?? "",
      }
    : undefined

  const landlordDefaults = {
    name: selected.name,
    slug: selected.slug,
    ownerName: selected.ownerName,
    address: selected.address,
    email: selected.email,
    phone: selected.phone ?? "",
    bgColor: selected.bgColor,
    textColor: selected.textColor,
    accentColor: selected.accentColor,
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
      <div className="space-y-8">
        <LandlordEditForm landlordId={selected.id} defaultValues={landlordDefaults} />
        <SettingsForm defaultValues={settingsDefaults} landlordId={selected.id} />
      </div>
    </div>
  )
}
