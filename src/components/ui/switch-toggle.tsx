import { cn } from "@/lib/utils"
import * as React from "react"

type SwitchStep = {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

type SwitchToggleProps = {
  steps: SwitchStep[]
  value: string
  onValueChange: (value: string) => void
  className?: string
  trackClassName?: string
  thumbClassName?: string
  labelClassName?: string
  disabled?: boolean
}

export function SwitchToggle({
  steps,
  value,
  onValueChange,
  className,
  trackClassName = "bg-gray-200 dark:bg-gray-700",
  thumbClassName = "bg-white dark:bg-gray-200",
  labelClassName = "text-xs font-medium",
  disabled = false,
}: SwitchToggleProps) {
  const activeIndex = steps.findIndex(step => step.value === value)
  const stepWidth = 100 / steps.length
  
  return (
    <div 
      className={cn(
        "relative w-full rounded-full p-1", 
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        trackClassName, 
        className
      )}
      aria-disabled={disabled}
    >
      <div 
        className={cn(
          "absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-in-out",
          thumbClassName,
          {
            'opacity-0': activeIndex === -1,
          }
        )}
        style={{
          left: `${activeIndex * stepWidth + 2}%`,
          width: `${stepWidth - 4}%`,
          height: 'calc(100% - 0.5rem)',
        }}
      />
      <div className="relative z-10 flex w-full">
        {steps.map((step) => {
          const isActive = value === step.value          
          return (
            <button
              key={step.value}
              type="button"
              disabled={disabled}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-1 px-1.5 rounded-md transition-colors duration-200",
                isActive ? 'text-foreground' : 'text-muted-foreground',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                labelClassName
              )}
              onClick={() => !disabled && onValueChange(step.value)}
            >

              <span className="whitespace-nowrap">{step.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
