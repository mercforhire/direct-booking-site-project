"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addIcalSource, removeIcalSource, triggerRoomSync } from "@/actions/ical-source"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface SerializedIcalSource {
  id: string
  url: string
  label: string | null
  roomId: string
  lastSync: string | null
  syncError: string | null
  createdAt: string
  updatedAt: string
}

interface IcalSourceManagerProps {
  roomId: string
  initialSources: SerializedIcalSource[]
}

function truncateUrl(url: string, maxLen = 60): string {
  return url.length > maxLen ? url.slice(0, maxLen) + "…" : url
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

export function IcalSourceManager({ roomId, initialSources }: IcalSourceManagerProps) {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [label, setLabel] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null)
  const [isAdding, startAddTransition] = useTransition()
  const [isSyncing, startSyncTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  function handleAdd() {
    setAddError(null)
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setAddError("URL is required")
      return
    }
    try {
      new URL(trimmedUrl)
    } catch {
      setAddError("Please enter a valid URL")
      return
    }

    startAddTransition(async () => {
      try {
        await addIcalSource(roomId, trimmedUrl, label.trim() || undefined)
        setUrl("")
        setLabel("")
        router.refresh()
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Failed to add source")
      }
    })
  }

  function handleRemove(sourceId: string) {
    setRemovingId(sourceId)
    startAddTransition(async () => {
      try {
        await removeIcalSource(sourceId)
        router.refresh()
      } catch (err) {
        console.error("Remove failed:", err)
      } finally {
        setRemovingId(null)
      }
    })
  }

  function handleSync() {
    setSyncResult(null)
    startSyncTransition(async () => {
      try {
        const result = await triggerRoomSync(roomId)
        setSyncResult(result)
        router.refresh()
      } catch (err) {
        setSyncResult({ synced: 0, errors: [err instanceof Error ? err.message : "Sync failed"] })
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-gray-900">iCal Sources</h2>
        <p className="text-sm text-gray-500">
          Import blocked dates from external calendars (e.g. Airbnb, VRBO).
        </p>
      </div>

      {/* Source list */}
      {initialSources.length === 0 ? (
        <p className="text-sm text-gray-400">
          No iCal sources configured. Add an Airbnb calendar URL to auto-sync blocked dates.
        </p>
      ) : (
        <div className="space-y-3">
          {initialSources.map((source) => (
            <div
              key={source.id}
              className="flex items-start justify-between gap-3 rounded-md border border-gray-200 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate" title={source.url}>
                  {source.label || truncateUrl(source.url)}
                </p>
                {source.label && (
                  <p className="text-xs text-gray-500 truncate" title={source.url}>
                    {truncateUrl(source.url)}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  {source.lastSync ? (
                    <span>Last synced: {formatRelativeTime(source.lastSync)}</span>
                  ) : (
                    <span>Never synced</span>
                  )}
                </div>
                {source.syncError && (
                  <p className="mt-1 text-xs text-red-600">{source.syncError}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                onClick={() => handleRemove(source.id)}
                disabled={removingId === source.id || isAdding}
              >
                {removingId === source.id ? "Removing…" : "Remove"}
              </Button>
            </div>
          ))}

          {/* Sync Now */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? "Syncing…" : "Sync Now"}
            </Button>
            {syncResult && (
              <span className={`text-xs ${syncResult.errors.length > 0 ? "text-red-600" : "text-green-600"}`}>
                {syncResult.errors.length > 0
                  ? `Sync errors: ${syncResult.errors.join(", ")}`
                  : `Synced ${syncResult.synced} source${syncResult.synced !== 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="space-y-2 rounded-md border border-dashed border-gray-300 p-4">
        <p className="text-sm font-medium text-gray-700">Add iCal URL</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="url"
            placeholder="https://www.airbnb.com/calendar/ical/..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setAddError(null) }}
            className="flex-1"
          />
          <Input
            type="text"
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="sm:w-40"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={isAdding}
          >
            {isAdding ? "Adding…" : "Add"}
          </Button>
        </div>
        {addError && (
          <p className="text-xs text-red-600">{addError}</p>
        )}
      </div>
    </div>
  )
}
