"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react"

import { cn } from "@/lib/utils"

export type WaveformProps = HTMLAttributes<HTMLDivElement> & {
  data?: number[]
  barWidth?: number
  barHeight?: number
  barGap?: number
  barRadius?: number
  barColor?: string
  playedColor?: string
  fadeEdges?: boolean
  fadeWidth?: number
  height?: string | number
  active?: boolean
  progress?: number
  onBarClick?: (index: number, value: number) => void
}

export const Waveform = ({
  data = [],
  barWidth = 4,
  barHeight: baseBarHeight = 4,
  barGap = 2,
  barRadius = 2,
  barColor,
  playedColor,
  fadeEdges = true,
  fadeWidth = 24,
  height = 128,
  active,
  progress = 0,
  onBarClick,
  className,
  ...props
}: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const heightStyle = typeof height === "number" ? `${height}px` : height
  const animFrameRef = useRef<number>(0)
  const renderWaveformRef = useRef<(time?: number) => void>(() => {})

  const resolvedPlayedColor = playedColor || barColor

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const renderWaveform = (animTime?: number) => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      const computedBarColor =
        barColor ||
        getComputedStyle(canvas).getPropertyValue("--foreground") ||
        "#94a3b8"

      const computedPlayedColor =
        resolvedPlayedColor ||
        getComputedStyle(canvas).getPropertyValue("--primary") ||
        "#34d399"

      const barCount = Math.floor(rect.width / (barWidth + barGap))
      const centerY = rect.height / 2
      const progressBarIndex = progress * barCount

      // Subtle pulse for active audio: oscillate the current bar
      let pulse = 0
      if (active && animTime !== undefined) {
        pulse = 0.3 * Math.sin(animTime * 6)
      }

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * data.length)
        const value = data[dataIndex] || 0
        const isPlayed = i <= progressBarIndex
        const isCurrent = active && i === Math.round(progressBarIndex)
        const barHeight = Math.max(baseBarHeight, value * rect.height * 0.8)
        const x = i * (barWidth + barGap)
        const y = centerY - barHeight / 2

        if (isPlayed) {
          ctx.fillStyle = computedPlayedColor
          ctx.globalAlpha = 0.85
        } else {
          ctx.fillStyle = computedBarColor
          ctx.globalAlpha = 0.35
        }

        if (isCurrent) {
          // Current bar: full opacity + subtle pulse height
          ctx.globalAlpha = 1
          const pulseHeight = barHeight + barHeight * pulse
          const pulseY = centerY - pulseHeight / 2
          if (barRadius > 0) {
            ctx.beginPath()
            ctx.roundRect(x, pulseY, barWidth, pulseHeight, barRadius)
            ctx.fill()
          } else {
            ctx.fillRect(x, pulseY, barWidth, pulseHeight)
          }
        } else {
          if (barRadius > 0) {
            ctx.beginPath()
            ctx.roundRect(x, y, barWidth, barHeight, barRadius)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, barWidth, barHeight)
          }
        }
      }

      if (fadeEdges && fadeWidth > 0 && rect.width > 0) {
        const gradient = ctx.createLinearGradient(0, 0, rect.width, 0)
        const fadePercent = Math.min(0.2, fadeWidth / rect.width)

        gradient.addColorStop(0, "rgba(255,255,255,1)")
        gradient.addColorStop(fadePercent, "rgba(255,255,255,0)")
        gradient.addColorStop(1 - fadePercent, "rgba(255,255,255,0)")
        gradient.addColorStop(1, "rgba(255,255,255,1)")

        ctx.globalCompositeOperation = "destination-out"
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, rect.width, rect.height)
        ctx.globalCompositeOperation = "source-over"
      }

      ctx.globalAlpha = 1
    }

    renderWaveformRef.current = renderWaveform

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
        renderWaveform()
      }
    })

    resizeObserver.observe(container)
    renderWaveform()

    return () => resizeObserver.disconnect()
  }, [
    data,
    barWidth,
    baseBarHeight,
    barGap,
    barRadius,
    barColor,
    resolvedPlayedColor,
    fadeEdges,
    fadeWidth,
    progress,
    active,
  ])

  useEffect(() => {
    if (!active) return
    let running = true
    const startTime = performance.now()
    const animate = (now: number) => {
      if (!running) return
      renderWaveformRef.current((now - startTime) / 1000)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [active])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onBarClick) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const barIndex = Math.floor(x / (barWidth + barGap))
    const dataIndex = Math.floor(
      (barIndex * data.length) / Math.floor(rect.width / (barWidth + barGap))
    )

    if (dataIndex >= 0 && dataIndex < data.length) {
      onBarClick(dataIndex, data[dataIndex])
    }
  }

  return (
    <div
      className={cn("relative", className)}
      ref={containerRef}
      style={{ height: heightStyle }}
      {...props}
    >
      <canvas
        className="block h-full w-full"
        onClick={handleClick}
        ref={canvasRef}
      />
    </div>
  )
}

export type AudioScrubberProps = WaveformProps & {
  currentTime?: number
  duration?: number
  onSeek?: (time: number) => void
  showHandle?: boolean
}

export const AudioScrubber = ({
  data = [],
  currentTime = 0,
  duration = 100,
  onSeek,
  showHandle = true,
  barWidth = 3,
  barHeight,
  barGap = 1,
  barRadius = 1,
  barColor,
  playedColor,
  height = 128,
  active,
  progress: externalProgress,
  className,
  ...props
}: AudioScrubberProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [localProgress, setLocalProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const progress = externalProgress ?? (duration > 0 ? currentTime / duration : 0)

  const waveformData =
    data.length > 0
      ? data
      : Array.from({ length: 100 }, () => 0.2 + Math.random() * 0.6)

  useEffect(() => {
    if (!isDragging && duration > 0) {
      setLocalProgress(currentTime / duration)
    }
  }, [currentTime, duration, isDragging])

  const handleScrub = useCallback(
    (clientX: number) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const p = x / rect.width
      const newTime = p * duration

      setLocalProgress(p)
      onSeek?.(newTime)
    },
    [duration, onSeek]
  )

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    handleScrub(e.clientX)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleScrub(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, duration, handleScrub])

  const displayProgress = isDragging ? localProgress : progress
  const heightStyle = typeof height === "number" ? `${height}px` : height

  return (
    <div
      aria-label="Audio waveform scrubber"
      aria-valuemax={duration}
      aria-valuemin={0}
      aria-valuenow={currentTime}
      className={cn("relative cursor-pointer select-none overflow-hidden", className)}
      onMouseDown={handleMouseDown}
      ref={containerRef}
      role="slider"
      style={{ height: heightStyle }}
      tabIndex={0}
      {...props}
    >
      <Waveform
        active={active}
        barColor={barColor}
        barGap={barGap}
        barRadius={barRadius}
        barWidth={barWidth}
        barHeight={barHeight}
        data={waveformData}
        fadeEdges={false}
        playedColor={playedColor}
        progress={displayProgress}
      />

      <div
        className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-emerald-400/80"
        style={{ left: `${displayProgress * 100}%` }}
      />

      {showHandle && (
        <div
          className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-900 bg-emerald-400 shadow-lg"
          style={{ left: `${displayProgress * 100}%` }}
        />
      )}
    </div>
  )
}

