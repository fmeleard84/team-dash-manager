import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/ui/components/button"
import { Calendar } from "@/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/popover"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  date?: Date  // Support pour Date native
  onSelect?: (date: Date | undefined) => void  // Support pour onSelect
  placeholder?: string
  disabled?: boolean
  minDate?: string
  maxDate?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  date,  // Support pour Date native
  onSelect,  // Support pour onSelect
  placeholder = "Sélectionner une date",
  disabled = false,
  minDate,
  maxDate,
  className
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Support both value (string) and date (Date) props
  const selectedDate = date || (value ? new Date(value + 'T00:00:00') : undefined)
  
  // Parse dates and set to start of day for accurate comparison
  const min = React.useMemo(() => {
    if (!minDate) return undefined
    const date = new Date(minDate + 'T00:00:00')
    date.setHours(0, 0, 0, 0)
    return date
  }, [minDate])
  
  const max = React.useMemo(() => {
    if (!maxDate) return undefined
    const date = new Date(maxDate + 'T00:00:00')
    date.setHours(23, 59, 59, 999)
    return date
  }, [maxDate])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Ensure the selected date respects min/max constraints
      const dateToCompare = new Date(date)
      dateToCompare.setHours(12, 0, 0, 0)
      
      if (min && dateToCompare < min) return
      if (max && dateToCompare > max) return
      
      // Support both onChange and onSelect callbacks
      if (onSelect) {
        onSelect(date)
      } else if (onChange) {
        onChange(date.toISOString().split('T')[0])
      }
      setOpen(false)
    }
  }

  // Function to check if a date should be disabled
  const isDateDisabled = (date: Date) => {
    const dateToCompare = new Date(date)
    dateToCompare.setHours(12, 0, 0, 0)
    
    if (min) {
      const minCompare = new Date(min)
      minCompare.setHours(0, 0, 0, 0)
      if (dateToCompare < minCompare) return true
    }
    
    if (max) {
      const maxCompare = new Date(max)
      maxCompare.setHours(23, 59, 59, 999)
      if (dateToCompare > maxCompare) return true
    }
    
    return false
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-12",
            "bg-background hover:bg-accent/50",
            "border-input hover:border-accent-foreground/20",
            "transition-all duration-200",
            !value && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {selectedDate ? (
            format(selectedDate, "d MMMM yyyy", { locale: fr })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-popover border-border shadow-lg" 
        align="start"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={isDateDisabled}
          initialFocus
          locale={fr}
          className="rounded-md"
          fromDate={min}
          toDate={max}
        />
      </PopoverContent>
    </Popover>
  )
}