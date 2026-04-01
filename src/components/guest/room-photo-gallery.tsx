"use client"

import { useState } from "react"
import Image from "next/image"
import * as Dialog from "@radix-ui/react-dialog"
import { BedDouble, ChevronLeft, ChevronRight, X } from "lucide-react"

interface RoomPhotoGalleryProps {
  photos: { url: string; position: number }[]
}

export function RoomPhotoGallery({ photos }: RoomPhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  function openLightbox(i: number) {
    setActiveIndex(i)
    setLightboxOpen(true)
  }

  return (
    <div>
      {/* Hero photo */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/7",
          overflow: "hidden",
          background: "#2a2618",
        }}
      >
        {photos.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <BedDouble style={{ color: "rgba(240,235,224,0.2)" }} size={48} />
          </div>
        ) : (
          <button
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "block",
              cursor: "pointer",
              border: "none",
              padding: 0,
              background: "none",
            }}
            onClick={() => openLightbox(0)}
            aria-label="Open photo gallery"
          >
            <Image
              src={photos[0].url}
              alt=""
              fill
              style={{ objectFit: "cover", transition: "transform 0.6s ease" }}
              priority
            />
            {/* Subtle gradient at bottom */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, transparent 55%, rgba(30,28,20,0.55) 100%)",
                pointerEvents: "none",
              }}
            />
            {/* Photo count badge */}
            {photos.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  bottom: "1.1rem",
                  right: "1.1rem",
                  background: "rgba(30,28,20,0.72)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "9999px",
                  padding: "0.3rem 0.85rem",
                  fontSize: "0.7rem",
                  color: "rgba(240,235,224,0.75)",
                  letterSpacing: "0.1em",
                  pointerEvents: "none",
                }}
              >
                1 / {photos.length}
              </div>
            )}
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "3px",
            overflowX: "auto",
            background: "#2a2618",
            padding: "3px 0 0",
            scrollbarWidth: "none",
          }}
        >
          {photos.slice(1).map((photo, index) => (
            <button
              key={photo.url}
              className="thumb-btn"
              style={{
                flexShrink: 0,
                position: "relative",
                width: "120px",
                height: "72px",
                overflow: "hidden",
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: "#2a2618",
                opacity: 0.82,
                transition: "opacity 0.2s ease",
              }}
              onClick={() => openLightbox(index + 1)}
              aria-label={`View photo ${index + 2}`}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.82" }}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                style={{ objectFit: "cover", transition: "transform 0.4s ease" }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {photos.length > 0 && (
        <Dialog.Root open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <Dialog.Portal>
            <Dialog.Overlay
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(10,9,6,0.92)",
                zIndex: 50,
                backdropFilter: "blur(4px)",
              }}
            />
            <Dialog.Content
              style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
              }}
            >
              <Dialog.Title className="sr-only">Photo gallery</Dialog.Title>

              {/* Current image */}
              <div
                style={{
                  position: "relative",
                  maxWidth: "90vw",
                  maxHeight: "85vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src={photos[activeIndex].url}
                  alt=""
                  width={1200}
                  height={900}
                  style={{
                    maxWidth: "90vw",
                    maxHeight: "85vh",
                    objectFit: "contain",
                    borderRadius: "6px",
                  }}
                />
                {/* Counter */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-2rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "0.72rem",
                    color: "rgba(240,235,224,0.35)",
                    letterSpacing: "0.12em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeIndex + 1} / {photos.length}
                </div>
              </div>

              {/* Prev button */}
              {activeIndex > 0 && (
                <button
                  style={{
                    position: "absolute",
                    left: "1.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(240,235,224,0.8)",
                    background: "rgba(30,28,20,0.6)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "9999px",
                    width: "2.5rem",
                    height: "2.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)",
                    transition: "background 0.2s ease",
                  }}
                  onClick={() => setActiveIndex((i) => i - 1)}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              {/* Next button */}
              {activeIndex < photos.length - 1 && (
                <button
                  style={{
                    position: "absolute",
                    right: "1.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(240,235,224,0.8)",
                    background: "rgba(30,28,20,0.6)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "9999px",
                    width: "2.5rem",
                    height: "2.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)",
                    transition: "background 0.2s ease",
                  }}
                  onClick={() => setActiveIndex((i) => i + 1)}
                  aria-label="Next photo"
                >
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Close button */}
              <Dialog.Close
                style={{
                  position: "absolute",
                  top: "1.5rem",
                  right: "1.5rem",
                  color: "rgba(240,235,224,0.7)",
                  background: "rgba(30,28,20,0.6)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "9999px",
                  width: "2.2rem",
                  height: "2.2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                }}
                aria-label="Close gallery"
              >
                <X size={16} />
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}
