"use client"

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { cn } from "@/lib/utils"
import { Combobox, type ComboboxOption } from "./combobox"
import { Label } from "./label"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

interface DualModeSelectProps {
  label: string
  htmlFor: string
  mode: "user" | "system"
  value: string
  options: ComboboxOption[]
  onModeChange: (mode: "user" | "system") => void
  onValueChange: (value: string) => void
  placeholder?: string
  tooltip?: string
  systemDescription?: string
  className?: string
  disabled?: boolean
}

export function DualModeSelect({
  label,
  htmlFor,
  mode,
  value,
  options,
  onModeChange,
  onValueChange,
  placeholder = "Select an option...",
  tooltip,
  systemDescription,
  className,
  disabled,
}: DualModeSelectProps) {
  const handleModeChange = (newMode: "user" | "system") => {
    onModeChange(newMode)
  }

  const showCombobox = mode === "user"

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger type="button" className="flex cursor-help">
              <span className="text-muted">ⓘ</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <ToggleGroupPrimitive.Root
        type="single"
        value={mode}
        onValueChange={(val) => val && handleModeChange(val as "user" | "system")}
        className="flex gap-0"
        disabled={disabled}
      >
        <ToggleGroupPrimitive.Item
          value="user"
          className={cn(
            "flex h-9 items-center justify-center rounded-l-md border border-r-0 border-border-subtle bg-surface-hover px-3 text-label-ui text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app data-[state=on]:bg-brand-primary data-[state=on]:text-text-on-brand hover:bg-surface-hover/80",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          User Defined
        </ToggleGroupPrimitive.Item>
        <ToggleGroupPrimitive.Item
          value="system"
          className={cn(
            "flex h-9 items-center justify-center rounded-r-md border border-border-subtle bg-surface-hover px-3 text-label-ui text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app data-[state=on]:bg-brand-primary data-[state=on]:text-text-on-brand hover:bg-surface-hover/80",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          System Defined
        </ToggleGroupPrimitive.Item>
      </ToggleGroupPrimitive.Root>
      {showCombobox && (
        <Combobox
          options={options}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      {!showCombobox && systemDescription && (
        <p className="text-body-ui text-muted">
          {systemDescription}
        </p>
      )}
    </div>
  )
}
