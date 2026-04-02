import { prisma } from "@/lib/prisma"
import { requireLandlordsWithSelected } from "@/lib/landlord"
import { SettingsForm } from "@/components/forms/settings-form"

export const dynamic = "force-dynamic"

interface SettingsPageProps {
  searchParams: Promise<{ landlord?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { landlord: landlordSlug } = await searchParams
  const { selected } = await requireLandlordsWithSelected(landlordSlug)

  const settings = await prisma.settings.findUnique({ where: { landlordId: selected.id } })
  const defaultValues = settings
    ? {
        serviceFeePercent: Number(settings.serviceFeePercent),
        depositAmount: Number(settings.depositAmount),
        etransferEmail: settings.etransferEmail ?? "",
      }
    : undefined

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
      <SettingsForm defaultValues={defaultValues} landlordId={selected.id} />
    </div>
  )
}
