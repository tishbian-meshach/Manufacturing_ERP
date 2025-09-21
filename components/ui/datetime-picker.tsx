'use client'

import * as React from 'react'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date and time',
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [isOpen, setIsOpen] = React.useState(false)
  const [timeValue, setTimeValue] = React.useState('')

  React.useEffect(() => {
    setSelectedDate(date)
    if (date) {
      setTimeValue(format(date, 'HH:mm'))
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const combinedDateTime = new Date(newDate)
      if (timeValue) {
        const [hours, minutes] = timeValue.split(':').map(Number)
        combinedDateTime.setHours(hours, minutes)
      }
      setSelectedDate(combinedDateTime)
      onDateChange?.(combinedDateTime)
    } else {
      setSelectedDate(undefined)
      onDateChange?.(undefined)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeValue(newTime)

    if (selectedDate && newTime) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(hours, minutes)
      setSelectedDate(newDateTime)
      onDateChange?.(newDateTime)
    }
  }

  const displayValue = selectedDate
    ? format(selectedDate, 'PPP p')
    : placeholder

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'w-full flex items-center justify-start text-left font-normal bg-white border border-gray-300 text-black hover:bg-gray-50 hover:border-gray-400 rounded-md px-3 py-2 cursor-pointer',
            !selectedDate && 'text-gray-500',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
          <span className="flex-1">{displayValue}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg" align="start">
        <div className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="bg-white text-black"
            classNames={{
              months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
              month: 'space-y-4 relative',
              caption: 'flex justify-between items-center pt-1 relative text-black',
              caption_label: 'text-sm font-medium text-black',
              month_caption: 'flex items-center justify-between h-8 w-full px-2',
              nav: 'absolute inset-0 flex mt-5 -ml-5 items-top justify-end w-full',
              nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-black hover:bg-gray-100 rounded-md',
              nav_button_previous: '',
              nav_button_next: '',
              table: 'w-full border-collapse space-y-1',
              head_row: 'flex',
              head_cell: 'text-gray-600 rounded-md w-9 font-normal text-[0.8rem]',
              row: 'flex w-full mt-2',
              cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
              day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-black hover:bg-gray-200 hover:text-black focus:bg-gray-200 focus:text-black',
              day_selected: 'bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white',
              day_today: 'bg-gray-100 text-black',
              day_outside: 'text-gray-400 opacity-50',
              day_disabled: 'text-gray-400 opacity-50',
              day_range_middle: 'aria-selected:bg-gray-100 aria-selected:text-black',
              day_hidden: 'invisible',
            }}
          />
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Label htmlFor="time" className="text-sm font-medium text-black mb-2 block">
              Time
            </Label>
            <Input
              id="time"
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-black focus:ring-black"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}