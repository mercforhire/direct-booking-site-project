import { prisma } from "@/lib/prisma"
import { SettingsForm } from "@/components/forms/settings-form"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: "global" } })
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
      <SettingsForm defaultValues={defaultValues} />
    </div>
  )
}
