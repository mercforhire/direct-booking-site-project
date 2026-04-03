import { differenceInDays } from "date-fns"

interface RoomPricingTableProps {
  baseNightlyRate: number
  fromPrice?: number
  cleaningFee: number
  extraGuestFee: number
  baseGuests: number
  addOns: { id: string; name: string; price: number }[]
  checkin?: string
  checkout?: string
}

export function RoomPricingTable({
  baseNightlyRate,
  fromPrice,
  cleaningFee,
  extraGuestFee,
  baseGuests,
  addOns,
  checkin,
  checkout,
}: RoomPricingTableProps) {
  let nights: number | null = null

  if (checkin && checkout) {
    const n = differenceInDays(
      new Date(checkout + "T00:00:00"),
      new Date(checkin + "T00:00:00")
    )
    if (n > 0) {
      nights = n
    }
  }

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "0.55rem 0",
    borderBottom: "1px solid color-mix(in srgb, var(--ll-text) 6%, transparent)",
    fontSize: "0.8rem",
  }

  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--ll-text) 3%, transparent)",
        border: "1px solid color-mix(in srgb, var(--ll-text) 7%, transparent)",
        borderRadius: "10px",
        padding: "1.5rem",
        color: "var(--ll-text)",
      }}
    >
      <div
        style={{
          fontSize: "0.63rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: 0.35,
          marginBottom: "0.6rem",
        }}
      >
        Pricing
      </div>

      {/* Rate headline */}
      <div style={{ marginBottom: "1rem" }}>
        <span
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            opacity: 0.4,
            marginRight: "0.3rem",
          }}
        >
          from
        </span>
        <span
          style={{
            fontFamily: "var(--font-bebas, serif)",
            fontSize: "2rem",
            letterSpacing: "0.04em",
            color: "var(--ll-accent)",
            lineHeight: 1,
          }}
        >
          ${(fromPrice ?? baseNightlyRate).toFixed(0)}
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            opacity: 0.45,
            marginLeft: "0.35rem",
            letterSpacing: "0.06em",
          }}
        >
          / night
        </span>
      </div>

      {/* Rows */}
      <div>
        <div style={rowStyle}>
          <span style={{ opacity: 0.55 }}>Nightly rate</span>
          <span style={{ fontWeight: 500 }}>
            <span style={{ opacity: 0.55, fontSize: "0.72rem" }}>varies by date</span>
          </span>
        </div>

        {nights !== null && (
          <div
            style={{
              ...rowStyle,
              background: "color-mix(in srgb, var(--ll-accent) 7%, transparent)",
              borderRadius: "6px",
              padding: "0.55rem 0.65rem",
              borderBottom: "none",
              margin: "0.25rem 0",
              fontSize: "0.75rem",
            }}
          >
            <span style={{ opacity: 0.7, fontStyle: "italic" }}>
              {nights} night{nights !== 1 ? "s" : ""}
            </span>
            <span style={{ opacity: 0.5, fontSize: "0.7rem" }}>
              exact total at booking
            </span>
          </div>
        )}

        <div style={rowStyle}>
          <span style={{ opacity: 0.55 }}>Cleaning fee</span>
          <span style={{ fontWeight: 500 }}>
            {cleaningFee === 0 ? (
              <span style={{ color: "var(--ll-accent)", fontWeight: 500 }}>Included</span>
            ) : (
              `$${cleaningFee.toFixed(2)}`
            )}
          </span>
        </div>

        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={{ opacity: 0.55 }}>Extra guest fee</span>
          <span style={{ fontWeight: 500, fontSize: "0.75rem", maxWidth: "140px", textAlign: "right", lineHeight: 1.4 }}>
            {extraGuestFee === 0 ? (
              <span style={{ color: "var(--ll-accent)" }}>None</span>
            ) : (
              <>
                ${extraGuestFee.toFixed(2)}/guest/night
                <span style={{ display: "block", fontSize: "0.68rem", opacity: 0.4 }}>
                  (base incl. {baseGuests} guest{baseGuests !== 1 ? "s" : ""})
                </span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Add-ons */}
      {addOns.length > 0 && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid color-mix(in srgb, var(--ll-text) 6%, transparent)" }}>
          <p
            style={{
              fontSize: "0.63rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.35,
              marginBottom: "0.5rem",
            }}
          >
            Add-ons available
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {addOns.map((addon) => (
              <div
                key={addon.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.78rem",
                  opacity: 0.65,
                }}
              >
                <span>{addon.name}</span>
                <span style={{ opacity: 0.8 }}>
                  {addon.price === 0 ? (
                    <span style={{ color: "var(--ll-accent)" }}>Free</span>
                  ) : (
                    `$${addon.price.toFixed(2)}`
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p
        style={{
          fontSize: "0.65rem",
          opacity: 0.3,
          marginTop: "1rem",
          lineHeight: 1.5,
        }}
      >
        Final price confirmed at approval. Rates vary by date.
      </p>
    </div>
  )
}
