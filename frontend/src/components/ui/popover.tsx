import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={
      `z-50 w-72 rounded-md border border-input bg-popover p-2 text-popover-foreground shadow-md outline-none` +
      (className ? ` ${className}` : "")
    }
    {...props}
  />
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName
