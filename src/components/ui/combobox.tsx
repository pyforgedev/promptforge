"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Check, ChevronDown } from "lucide-react"
import { Command } from "cmdk"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  icon?: React.ReactNode
  /** Optional trailing content aligned to the right (e.g. a count badge) */
  badge?: React.ReactNode
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  /** Optional action row rendered below the option list (e.g. "create new") */
  footer?: React.ReactNode
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  className,
  disabled,
  id,
  footer,
}: ComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const lower = search.toLowerCase()
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(lower)
    )
  }, [options, search])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-border-subtle bg-surface px-3 py-2 text-body-ui transition-colors duration-150 hover:bg-surface-hover data-[placeholder]:text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-app disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("flex min-w-0 flex-1 items-center gap-1.5", selectedOption ? "text-primary" : "text-muted")}>
            {selectedOption?.icon && <span aria-hidden="true">{selectedOption.icon}</span>}
            <span className="truncate">{selectedOption?.label || placeholder}</span>
            {selectedOption?.badge && <span className="ml-auto rounded-full bg-surface-hover px-1.5 py-0.5 text-caption-ui tabular-nums text-muted">{selectedOption.badge}</span>}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-dropdown w-[var(--radix-popover-trigger-width)] overflow-y-auto overflow-x-hidden rounded-md border border-border-strong bg-surface/80 p-0 text-primary shadow-xl backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-[var(--radix-popover-content-transform-origin)]"
          sideOffset={4}
          align="start"
        >
          <Command
            className="flex h-full w-full flex-col overflow-hidden bg-transparent"
            shouldFilter={false}
          >
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={`${t('common.search')}...`}
              className="flex w-full border-b border-border-subtle bg-transparent px-3 py-2 text-body-ui outline-none placeholder:text-muted"
            />
            <Command.List className="max-h-[200px] overflow-y-auto p-1">
              <Command.Empty className="py-6 text-center text-body-ui text-muted">
                {t('common.noResults')}
              </Command.Empty>
              {filteredOptions.map((opt) => (
                <Command.Item
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => {
                    onValueChange(opt.value)
                    setOpen(false)
                    setSearch("")
                  }}
                  className="group relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-label-ui text-secondary outline-none transition-colors duration-150 focus:bg-surface-hover focus:text-primary hover:bg-surface-hover data-[selected=true]:bg-surface-hover data-[selected=true]:text-primary"
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {opt.value === value && <Check className="h-4 w-4" />}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    {opt.icon && <span aria-hidden="true" className="transition-transform duration-150 group-hover:scale-110">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {opt.badge && (
                    <span className="ml-auto shrink-0 rounded-full bg-surface-hover px-1.5 py-0.5 text-caption-ui tabular-nums text-muted">
                      {opt.badge}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.List>
            {footer && (
              <div className="border-t border-border-subtle p-1">
                {footer}
              </div>
            )}
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
