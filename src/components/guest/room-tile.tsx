"use client"

import Link from "next/link"
import Image from "next/image"

interface RoomTilePhoto {
  url: string
  position: number
}

interface RoomTileRoom {
  id: string
  name: string
  description: string
  location: string
  baseNightlyRate: number
  maxGuests: number
  photos: RoomTilePhoto[]
  blockedDateStrings: string[]
  fromPrice?: number
}

interface RoomTileProps {
  room: RoomTileRoom
  isAvailable: boolean
  searchParams: string
  basePath?: string
}

export function RoomTile({ room, isAvailable, searchParams, basePath = "" }: RoomTileProps) {
  const href = `${basePath}/rooms/${room.id}${searchParams ? `?${searchParams}` : ""}`
  const coverPhoto = room.photos[0]

  return (
    <Link
      href={href}
      className="room-tile tile-grid"
      style={{
        textDecoration: "none",
        color: "#f0ebe0",
        display: "grid",
        gridTemplateColumns: "400px 1fr",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        opacity: isAvailable ? 1 : 0.42,
        transition: "border-color 0.25s ease",
        minHeight: "260px",
      }}
    >
      {/* ── Photo ────────────────────────────────── */}
      <div
        className="tile-photo-wrap"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#2a2618",
          minHeight: "260px",
        }}
      >
        {coverPhoto ? (
          <Image
            src={coverPhoto.url}
            alt={room.name}
            fill
            className="tile-photo"
            style={{
              objectFit: "cover",
              transition: "transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
            sizes="(max-width: 860px) 100vw, 400px"
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              opacity: 0.2,
            }}
          >
            No Photo
          </div>
        )}

        {/* Unavailable pill */}
        {!isAvailable && (
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              background: "rgba(20,18,12,0.82)",
              backdropFilter: "blur(6px)",
              borderRadius: "9999px",
              padding: "0.28rem 0.85rem",
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#f0ebe0",
            }}
          >
            Unavailable
          </div>
        )}
      </div>

      {/* ── Info panel ───────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2rem 2.5rem",
        }}
      >
        {/* Top: name + meta + description */}
        <div>
          <h2
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              lineHeight: 0.9,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              margin: "0 0 0.5rem",
            }}
          >
            {room.name}
          </h2>

          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.4,
              marginBottom: "1.1rem",
            }}
          >
            Up to {room.maxGuests} guest{room.maxGuests !== 1 ? "s" : ""}
            {room.location ? ` · ${room.location}` : ""}
          </div>

          {room.description && (
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.75,
                opacity: 0.58,
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {room.description}
            </p>
          )}
        </div>

        {/* Bottom: rate + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.6rem",
                opacity: 0.38,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              from
            </div>
            <div
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "2.2rem",
                letterSpacing: "0.04em",
                lineHeight: 1,
                color: "#f0ebe0",
              }}
            >
              ${(room.fromPrice ?? room.baseNightlyRate).toFixed(0)}
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                opacity: 0.38,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginTop: "1px",
              }}
            >
              per night
            </div>
          </div>

          <div
            className={isAvailable ? "tile-cta" : ""}
            style={{
              background: isAvailable ? "#7c3d18" : "rgba(255,255,255,0.08)",
              color: "#f0ebe0",
              padding: "0.72rem 1.9rem",
              borderRadius: "9999px",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              transition: "background 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            {isAvailable ? "View & Book →" : "View Room →"}
          </div>
        </div>
      </div>
    </Link>
  )
}
