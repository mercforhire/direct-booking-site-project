import { differenceInDays } from "date-fns"

interface RoomPricingTableProps {
  baseNightlyRate: number
  cleaningFee: number
  extraGuestFee: number
  baseGuests: number
  addOns: { id: string; name: string; price: number }[]
  checkin?: string
  checkout?: string
}

export function RoomPricingTable({
  baseNightlyRate,
  cleaningFee,
  extraGuestFee,
  baseGuests,
  addOns,
  checkin,
  checkout,
}: RoomPricingTableProps) {
  let nights: number | null = null
  let subtotal: number | null = null

  if (checkin && checkout) {
    const n = differenceInDays(
      new Date(checkout + "T00:00:00"),
      new Date(checkin + "T00:00:00")
    )
    if (n > 0) {
      nights = n
      subtotal = n * baseNightlyRate
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h2>
      <table className="w-full text-sm">
        <tbody>
          {/* Base nightly rate */}
          <tr className="border-b border-gray-100">
            <td className="py-2 text-gray-700">Base nightly rate</td>
            <td className="py-2 text-right text-gray-900 font-medium">
              ${baseNightlyRate.toFixed(2)} / night
            </td>
          </tr>

          {/* Nightly estimate (conditional) */}
          {nights !== null && subtotal !== null && (
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className="py-2 pl-4 text-gray-500 italic" colSpan={2}>
                {nights} nights &times; ${baseNightlyRate.toFixed(2)} ={" "}
                ${subtotal.toFixed(2)}
              </td>
            </tr>
          )}

          {/* Cleaning fee */}
          <tr className="border-b border-gray-100">
            <td className="py-2 text-gray-700">Cleaning fee</td>
            <td className="py-2 text-right text-gray-900">
              {cleaningFee === 0 ? "Included" : `$${cleaningFee.toFixed(2)}`}
            </td>
          </tr>

          {/* Extra guest fee */}
          <tr className="border-b border-gray-100">
            <td className="py-2 text-gray-700">Extra guest fee</td>
            <td className="py-2 text-right text-gray-900">
              {extraGuestFee === 0
                ? "No extra guest fee"
                : `$${extraGuestFee.toFixed(2)} per extra guest, per night (base rate includes ${baseGuests} ${baseGuests === 1 ? "guest" : "guests"})`}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Add-ons */}
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Add-ons</p>
        {addOns.length === 0 ? (
          <p className="text-sm text-gray-500">None available</p>
        ) : (
          <ul className="space-y-1">
            {addOns.map((addon) => (
              <li key={addon.id} className="text-sm text-gray-700">
                {addon.name}: {addon.price === 0 ? "Free" : `$${addon.price.toFixed(2)}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footnote */}
      <p className="text-xs text-gray-400 mt-4">
        Final price set by landlord at approval
      </p>
    </section>
  )
}
