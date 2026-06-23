"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Check, ChevronDown } from "lucide-react"
import { Command } from "cmdk"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  className,
  disabled,
}: ComboboxProps) {
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
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm transition-colors duration-150 hover:bg-surface-hover data-[placeholder]:text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            className
          )}
          aria-label={placeholder}
        >
          <span className={selectedOption ? "text-primary" : "text-muted"}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-dropdown w-[--radix-popover-trigger-width] overflow-y-auto overflow-x-hidden rounded-md border border-border-strong bg-overlay/80 backdrop-blur-md p-0 text-primary shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-[--radix-popover-content-transform-origin]"
          sideOffset={4}
          align="start"
        >
          <Command
            className="flex h-full w-full flex-col overflow-hidden bg-transparent"
            filter={(currentValue, search) => {
              if (!search) return 1
              return currentValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }}
          >
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search..."
              className="flex w-full border-b border-border-subtle bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted"
            />
            <Command.List className="max-h-[200px] overflow-y-auto p-1">
              <Command.Empty className="py-6 text-center text-sm text-muted">
                No results found.
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
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors duration-150 focus:bg-surface-hover focus:text-primary hover:bg-surface-hover data-[selected=true]:bg-surface-hover"
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </span>
                  {opt.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}