import { LandlordForm } from "@/components/forms/landlord-form"

export const dynamic = "force-dynamic"

export default function NewLandlordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Add New Property</h1>
      <LandlordForm />
    </div>
  )
}
