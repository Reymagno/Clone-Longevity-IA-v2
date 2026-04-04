'use client'

import { useEffect, useState } from 'react'
import { Users, ArrowUpCircle } from 'lucide-react'
import Link from 'next/link'

export function SeatCounter() {
  const [data, setData] = useState<{ used: number; limit: number } | null>(null)

  useEffect(() => {
    fetch('/api/subscription')
      .then(res => res.json())
      .then(d => {
        if (d.hasSubscription && d.seatLimit > 1) {
          setData({ used: d.seatsUsed, limit: d.seatLimit })
        }
      })
      .catch(() => {})
  }, [])

  if (!data) return null

  const pct = Math.round((data.used / data.limit) * 100)
  const isNearLimit = pct >= 80
  const isAtLimit = data.used >= data.limit

  return (
    <div className={`px-3 py-2 rounded-xl border text-xs ${
      isAtLimit ? 'border-danger/30 bg-danger/5'
        : isNearLimit ? 'border-warning/30 bg-warning/5'
        : 'border-border/40 bg-muted/20'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users size={12} />
          {data.used} / {data.limit}
        </span>
        {isNearLimit && (
          <Link href="/pricing" className="flex items-center gap-1 text-accent hover:underline text-[10px]">
            <ArrowUpCircle size={12} /> Upgrade
          </Link>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isAtLimit ? 'bg-danger' : isNearLimit ? 'bg-warning' : 'bg-accent'
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
