/**
 * Date Jumper Component
 *
 * Floating action button that opens a date picker to jump
 * to a specific date in the conversation.
 */

import React, { useState, useMemo } from 'react';

interface DateJumperProps {
  /** Earliest message date in the conversation */
  minDate: number;
  /** Latest message date in the conversation */
  maxDate: number;
  /** Callback when a date is selected */
  onDateSelect: (timestamp: number) => void;
}

export function DateJumper({ minDate, maxDate, onDateSelect }: DateJumperProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleDateSelect = (timestamp: number) => {
    onDateSelect(timestamp);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-6 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-105 z-20"
        title="Jump to Date"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Date picker modal */}
      {isOpen && (
        <DatePickerModal
          minDate={minDate}
          maxDate={maxDate}
          onSelect={handleDateSelect}
          onClose={handleClose}
        />
      )}
    </>
  );
}

/**
 * Date Picker Modal
 */
interface DatePickerModalProps {
  minDate: number;
  maxDate: number;
  onSelect: (timestamp: number) => void;
  onClose: () => void;
}

function DatePickerModal({ minDate, maxDate, onSelect, onClose }: DatePickerModalProps) {
  const minDateObj = new Date(minDate);
  const maxDateObj = new Date(maxDate);

  // Initialize to current month/year, constrained to message date range
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    if (now > maxDateObj) return maxDateObj.getFullYear();
    if (now < minDateObj) return minDateObj.getFullYear();
    return now.getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    if (now > maxDateObj) return maxDateObj.getMonth();
    if (now < minDateObj) return minDateObj.getMonth();
    return now.getMonth();
  });

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Generate year options
  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = minDateObj.getFullYear(); y <= maxDateObj.getFullYear(); y++) {
      result.push(y);
    }
    return result;
  }, [minDateObj, maxDateObj]);

  // Generate month options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate days in the selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Get the first day of the month (0 = Sunday)
  const firstDayOfMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedYear, selectedMonth]);

  // Check if a date is within the valid range
  const isDateValid = (day: number): boolean => {
    const date = new Date(selectedYear, selectedMonth, day);
    return date >= new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate()) &&
           date <= new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate());
  };

  // Handle quick navigation
  const handleOldest = () => {
    onSelect(minDate);
  };

  const handleNewest = () => {
    onSelect(maxDate);
  };

  // Handle day selection
  const handleDayClick = (day: number) => {
    if (isDateValid(day)) {
      setSelectedDay(day);
    }
  };

  // Handle go button
  const handleGo = () => {
    if (selectedDay !== null) {
      const date = new Date(selectedYear, selectedMonth, selectedDay);
      date.setHours(0, 0, 0, 0);
      onSelect(date.getTime());
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl p-4 w-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Jump to Date</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleOldest}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
          >
            Oldest
          </button>
          <button
            onClick={handleNewest}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
          >
            Newest
          </button>
        </div>

        {/* Year/Month selectors */}
        <div className="flex gap-2 mb-4">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(Number(e.target.value));
              setSelectedDay(null);
            }}
            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setSelectedDay(null);
            }}
            className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Calendar grid */}
        <div className="mb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-center text-xs text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first of the month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isValid = isDateValid(day);
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  disabled={!isValid}
                  className={`aspect-square flex items-center justify-center text-sm rounded transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isValid
                      ? 'text-white hover:bg-gray-700'
                      : 'text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date range info */}
        <div className="text-xs text-gray-500 text-center mb-4">
          Messages from {minDateObj.toLocaleDateString()} to {maxDateObj.toLocaleDateString()}
        </div>

        {/* Go button */}
        <button
          onClick={handleGo}
          disabled={selectedDay === null}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
        >
          Go to Date
        </button>
      </div>
    </div>
  );
}
