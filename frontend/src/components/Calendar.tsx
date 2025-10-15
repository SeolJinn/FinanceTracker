"use client"

import * as React from "react"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"

type CalendarComponentProps = {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  buttonClassName?: string
}

export function CalendarComponent({
  value,
  onChange,
  placeholder = "Pick a date",
  buttonClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
}: CalendarComponentProps) {
  const isControlled = typeof value !== 'undefined' && typeof onChange === 'function'
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(value)
  const date = isControlled ? value : internalDate
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isControlled) return
    // keep internal state in sync if parent controls it
    setInternalDate(value)
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={buttonClassName}
          onClick={() => setOpen(true)}
        >
          {date ? date.toLocaleDateString() : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 border-0 w-auto bg-transparent shadow-none" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            // Always notify parent if onChange is provided
            if (onChange) {
              onChange(d)
            }
            // Maintain internal state for uncontrolled usage
            if (!isControlled) {
              setInternalDate(d)
            }
            if (d) setOpen(false)
          }}
          className="rounded-md border shadow-sm"
          captionLayout="label"
        />
      </PopoverContent>
    </Popover>
  )
}


