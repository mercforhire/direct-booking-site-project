export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { getLandlordBySlug } from "@/lib/landlord"
import { prisma } from "@/lib/prisma"

export default async function LandlordHomePage({
  params,
}: {
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) notFound()

  const rooms = await prisma.room.findMany({
    where: { landlordId: landlord.id, photos: { some: {} } },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  })

  const heroRoom = rooms[0]
  const featured = rooms.slice(0, 3)

  const base = `/${slug}`

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <style>{`
        .a1 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) both; }
        .a2 { animation: fadeUp 0.9s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .a3 { animation: fadeUp 0.9s 0.22s cubic-bezier(0.16,1,0.3,1) both; }
        .a4 { animation: fadeUp 0.9s 0.34s cubic-bezier(0.16,1,0.3,1) both; }
        .a5 { animation: fadeIn 1.2s 0.1s both; }
        .room-card:hover .room-img { transform: scale(1.04); }
        .room-card:hover .room-arrow { transform: translateX(4px); }
        .admin-link:hover { opacity: 0.3 !important; }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-image-col { display: none !important; }
          .rooms-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .rooms-grid { grid-template-columns: 1fr !important; }
          .hero-pad { padding: 2rem 1.5rem !important; }
          .section-pad { padding: 2.5rem 1.5rem !important; }
          .footer-pad { padding: 1rem 1.5rem !important; }
          .benefits-list { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav
        className="nav-pad"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.4rem 3rem",
          borderBottom: "1px solid color-mix(in srgb, var(--ll-text) 8%, transparent)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "1.6rem",
              letterSpacing: "0.12em",
              lineHeight: 1,
            }}
          >
            {landlord.name}
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.14em",
              opacity: 0.4,
              marginTop: "2px",
              textTransform: "uppercase",
            }}
          >
            {landlord.address}
          </div>
        </div>

        <Link
          href={`${base}/rooms`}
          className="brown-btn"
          style={{
            background: landlord.accentColor,
            color: landlord.textColor,
            padding: "0.55rem 1.6rem",
            borderRadius: "9999px",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textDecoration: "none",
            transition: "background 0.2s ease",
          }}
        >
          View Rooms
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section
        className="hero-pad hero-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: "3.5rem",
          alignItems: "center",
          padding: "3.5rem 3rem 3rem",
          minHeight: "calc(100vh - 72px)",
        }}
      >
        {/* Left — copy */}
        <div style={{ maxWidth: "560px" }}>
          <div
            className="a1"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: `${landlord.accentColor}33`,
              border: `1px solid ${landlord.accentColor}66`,
              borderRadius: "9999px",
              padding: "0.3rem 1rem",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: landlord.accentColor,
              marginBottom: "1.8rem",
            }}
          >
            <span>✦</span>
            <span>Direct booking &mdash; no Airbnb fees</span>
          </div>

          <h1
            className="a2"
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(4rem, 10vw, 7.5rem)",
              lineHeight: 0.9,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              margin: "0 0 2rem",
              color: landlord.textColor,
            }}
          >
            Welcome
            <br />
            to
            <br />
            <span style={{ color: landlord.accentColor }}>{landlord.name}</span>
          </h1>

          <p
            className="a3"
            style={{
              opacity: 0.62,
              lineHeight: 1.75,
              fontSize: "0.95rem",
              maxWidth: "36rem",
              marginBottom: "2rem",
            }}
          >
            You found us on Airbnb &mdash; now book directly and keep more money
            in your pocket. Same home, same rooms, same host. No platform
            service fees.
          </p>

          <div
            className="a3 benefits-list"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.6rem",
              marginBottom: "2.5rem",
            }}
          >
            {[
              "No Airbnb service fees",
              `Direct contact with ${landlord.ownerName}`,
              "Flexible arrangements",
              "Returning guest rates",
            ].map((b) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.82rem",
                  opacity: 0.75,
                }}
              >
                <span style={{ color: landlord.accentColor, fontSize: "0.9rem" }}>✓</span>
                {b}
              </div>
            ))}
          </div>

          <div
            className="a4"
            style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}
          >
            <Link
              href={`${base}/rooms`}
              className="brown-btn"
              style={{
                background: "var(--ll-accent)",
                color: landlord.textColor,
                padding: "0.9rem 2.4rem",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "background 0.2s ease",
              }}
            >
              Browse Rooms
            </Link>
            <Link
              href={`${base}/guest/login?next=${base}/my-bookings`}
              className="ghost-btn"
              style={{
                border: `1px solid ${landlord.textColor}40`,
                color: `${landlord.textColor}A6`,
                padding: "0.9rem 2rem",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "background 0.2s ease",
              }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Right — hero room photo */}
        {heroRoom?.photos[0] && (
          <div
            className="a5 hero-image-col"
            style={{
              position: "relative",
              height: "min(62vh, 560px)",
              borderRadius: "12px",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <Image
              src={heroRoom.photos[0].url}
              alt={heroRoom.name}
              fill
              style={{ objectFit: "cover" }}
              priority
              sizes="420px"
            />
            <div
              style={{
                position: "absolute",
                bottom: "1.2rem",
                left: "1.2rem",
                background: "rgba(30,28,20,0.75)",
                backdropFilter: "blur(8px)",
                borderRadius: "8px",
                padding: "0.65rem 1rem",
                fontSize: "0.75rem",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "1px" }}>
                {heroRoom.name}
              </div>
              <div style={{ opacity: 0.6, fontSize: "0.7rem" }}>
                Up to {heroRoom.maxGuests} guest
                {heroRoom.maxGuests !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Savings banner ──────────────────────────────── */}
      <div
        className="section-pad"
        style={{
          padding: "1.5rem 3rem",
          background: `${landlord.accentColor}1F`,
          borderTop: `1px solid ${landlord.accentColor}33`,
          borderBottom: `1px solid ${landlord.accentColor}33`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "2rem",
          flexWrap: "wrap",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "0.8rem", opacity: 0.55, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Why book direct?
        </div>
        <div
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: "1.4rem",
            letterSpacing: "0.06em",
            color: landlord.accentColor,
          }}
        >
          Save up to 15%
        </div>
        <div style={{ fontSize: "0.82rem", opacity: 0.65, maxWidth: "28rem", lineHeight: 1.6 }}>
          Airbnb charges guests a 14–16% service fee on every booking.
          Book directly with {landlord.ownerName} and those fees stay in your wallet.
        </div>
        <Link
          href={`${base}/rooms`}
          style={{
            fontSize: "0.75rem",
            color: landlord.accentColor,
            textDecoration: "none",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          See Rooms →
        </Link>
      </div>

      {/* ── Rooms grid ──────────────────────────────────── */}
      {featured.length > 0 && (
        <section
          className="section-pad"
          style={{ padding: "3.5rem 3rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "2rem",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "2rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Available Rooms
            </h2>
            <Link
              href={`${base}/rooms`}
              className="nav-link"
              style={{
                fontSize: "0.78rem",
                color: landlord.accentColor,
                textDecoration: "none",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.9,
                transition: "opacity 0.2s ease",
              }}
            >
              View All →
            </Link>
          </div>

          <div
            className="rooms-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1.25rem",
            }}
          >
            {featured.map((room) => (
              <Link
                key={room.id}
                href={`${base}/rooms/${room.id}`}
                className="room-card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  background: "color-mix(in srgb, var(--ll-text) 4%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--ll-text) 7%, transparent)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: "200px",
                    overflow: "hidden",
                    background: "#2a2618",
                  }}
                >
                  {room.photos[0] && (
                    <Image
                      src={room.photos[0].url}
                      alt={room.name}
                      fill
                      className="room-img"
                      style={{
                        objectFit: "cover",
                        transition: "transform 0.5s ease",
                      }}
                      sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                    />
                  )}
                </div>

                <div
                  style={{
                    padding: "1.1rem 1.2rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "3px" }}>
                      {room.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.45 }}>
                      Up to {room.maxGuests} guest
                      {room.maxGuests !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <span
                    className="room-arrow"
                    style={{
                      color: landlord.accentColor,
                      fontSize: "1rem",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Returning guest strip ───────────────────────── */}
      <div
        className="footer-pad"
        style={{
          marginTop: "auto",
          padding: "2rem 3rem",
          borderTop: "1px solid color-mix(in srgb, var(--ll-text) 7%, transparent)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "3px" }}>
            Already booked with us?
          </div>
          <div style={{ fontSize: "0.78rem", opacity: 0.45 }}>
            Sign in to view your upcoming &amp; past bookings.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <Link
            href={`${base}/guest/signup`}
            className="ghost-btn"
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.4,
              color: landlord.textColor,
              textDecoration: "none",
              transition: "opacity 0.2s ease",
            }}
          >
            Create account
          </Link>
          <Link
            href={`${base}/guest/login?next=${base}/my-bookings`}
            className="ghost-btn"
            style={{
              border: "1px solid color-mix(in srgb, var(--ll-text) 20%, transparent)",
              color: `${landlord.textColor}A6`,
              padding: "0.55rem 1.4rem",
              borderRadius: "9999px",
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "background 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            My Bookings →
          </Link>
        </div>
      </div>

      {/* ── Admin footer ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "0.8rem 3rem",
          borderTop: "1px solid color-mix(in srgb, var(--ll-text) 4%, transparent)",
        }}
      >
        <Link
          href="/login"
          className="admin-link"
          style={{
            opacity: 0.15,
            color: landlord.textColor,
            fontSize: "0.65rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
            transition: "opacity 0.2s ease",
          }}
        >
          Admin
        </Link>
      </div>
    </div>
  )
}
