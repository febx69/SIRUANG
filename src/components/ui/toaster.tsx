// src/components/ui/toaster.tsx
// Modal alert bergaya Srikandi — animasi centang/silang, auto dismiss 1 detik

import { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { createPortal } from "react-dom"

const AUTO_DISMISS_MS = 1200

export function Toaster() {
  const { toasts, dismiss } = useToast()

  const dismissRef = useRef(dismiss)
  useEffect(() => { dismissRef.current = dismiss }, [dismiss])

  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    toasts.forEach(t => {
      if (!timerRefs.current[t.id]) {
        timerRefs.current[t.id] = setTimeout(() => {
          dismissRef.current(t.id)
          delete timerRefs.current[t.id]
        }, AUTO_DISMISS_MS)
      }
    })

    const activeIds = new Set(toasts.map(t => t.id))
    Object.keys(timerRefs.current).forEach(id => {
      if (!activeIds.has(id)) {
        clearTimeout(timerRefs.current[id])
        delete timerRefs.current[id]
      }
    })
  }, [toasts])

  useEffect(() => {
    return () => { Object.values(timerRefs.current).forEach(clearTimeout) }
  }, [])

  if (toasts.length === 0) return null

  return createPortal(
    <>
      <style>{`
        @keyframes modal-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes circle-draw {
          from { stroke-dashoffset: 226; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes check-draw {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes x-line-draw {
          from { stroke-dashoffset: 40; }
          to   { stroke-dashoffset: 0; }
        }

        .circle-success {
          stroke-dasharray: 226;
          stroke-dashoffset: 226;
          animation: circle-draw 0.5s cubic-bezier(0.65,0,0.45,1) 0.05s forwards;
        }
        .check-mark {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: check-draw 0.35s cubic-bezier(0.65,0,0.45,1) 0.5s forwards;
        }
        .circle-error {
          stroke-dasharray: 226;
          stroke-dashoffset: 226;
          animation: circle-draw 0.5s cubic-bezier(0.65,0,0.45,1) 0.05s forwards;
        }
        .x-line1 {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: x-line-draw 0.25s cubic-bezier(0.65,0,0.45,1) 0.5s forwards;
        }
        .x-line2 {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: x-line-draw 0.25s cubic-bezier(0.65,0,0.45,1) 0.7s forwards;
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.35)",
        animation: "modal-backdrop-in 0.2s ease forwards",
      }} />

      {toasts.slice(0, 1).map(t => {
        const isError = t.variant === "destructive"
        return (
          <div
            key={t.id}
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
              width: "min(320px, calc(100vw - 48px))",
              background: "white",
              borderRadius: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              padding: "40px 32px 36px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              animation: "modal-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            {isError ? (
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle className="circle-error" cx="40" cy="40" r="36"
                  stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
                <line className="x-line1" x1="26" y1="26" x2="54" y2="54"
                  stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
                <line className="x-line2" x1="54" y1="26" x2="26" y2="54"
                  stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle className="circle-success" cx="40" cy="40" r="36"
                  stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" />
                <polyline className="check-mark" points="24,41 35,52 56,30"
                  stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round"
                  strokeLinejoin="round" fill="none" />
              </svg>
            )}

            <p style={{
              margin: "20px 0 8px", fontSize: "20px", fontWeight: 700,
              color: isError ? "#991b1b" : "#15803d", lineHeight: "1.3",
            }}>
              {t.title}
            </p>

            {t.description && (
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
                {String(t.description)}
              </p>
            )}
          </div>
        )
      })}
    </>,
    document.body
  )
}