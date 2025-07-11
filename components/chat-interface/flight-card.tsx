'use client';

import cx from 'classnames';
import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';

interface FlightData {
  flight_date: string;
  flight_status: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted';
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal?: string;
    gate?: string;
    delay?: number;
    scheduled: string;
    estimated?: string;
    actual?: string;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal?: string;
    gate?: string;
    baggage?: string;
    delay?: number;
    scheduled: string;
    estimated?: string;
    actual?: string;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
  };
  aircraft?: {
    registration?: string;
    iata?: string;
    icao?: string;
  };
}

const SAMPLE_FLIGHT: FlightData = {
  flight_date: "2025-01-15",
  flight_status: "active",
  departure: {
    airport: "San Francisco International",
    timezone: "America/Los_Angeles",
    iata: "SFO",
    icao: "KSFO",
    terminal: "2",
    gate: "D11",
    delay: 13,
    scheduled: "2025-01-15T04:20:00+00:00",
    estimated: "2025-01-15T04:20:00+00:00",
    actual: "2025-01-15T04:20:13+00:00"
  },
  arrival: {
    airport: "Dallas/Fort Worth International",
    timezone: "America/Chicago",
    iata: "DFW",
    icao: "KDFW",
    terminal: "A",
    gate: "A22",
    baggage: "A17",
    delay: 0,
    scheduled: "2025-01-15T04:20:00+00:00",
    estimated: "2025-01-15T04:20:00+00:00"
  },
  airline: {
    name: "American Airlines",
    iata: "AA",
    icao: "AAL"
  },
  flight: {
    number: "1004",
    iata: "AA1004",
    icao: "AAL1004"
  },
  aircraft: {
    registration: "N160AN",
    iata: "A321",
    icao: "A321"
  }
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled': return 'bg-blue-500';
    case 'active': return 'bg-green-500';
    case 'landed': return 'bg-gray-500';
    case 'cancelled': return 'bg-red-500';
    case 'incident': return 'bg-red-600';
    case 'diverted': return 'bg-yellow-500';
    default: return 'bg-gray-400';
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'scheduled': return '✅';
    case 'active': return '✈️';
    case 'landed': return '🛬';
    case 'cancelled': return '❌';
    case 'incident': return '⚠️';
    case 'diverted': return '🔄';
    default: return '❓';
  }
}

function getDisplayStatus(status: string): string {
  switch (status) {
    case 'scheduled': return 'On Time';
    case 'active': return 'In Flight';
    case 'landed': return 'Landed';
    case 'cancelled': return 'Cancelled';
    case 'incident': return 'Incident';
    case 'diverted': return 'Diverted';
    default: return status;
  }
}

function formatTime(timeString: string, timezone?: string): string {
  try {
    // Log the raw time string to see what format we're getting
    console.log('📅 Raw time string:', timeString, 'Airport timezone:', timezone);
    
    // Extract time from ISO string without timezone conversion
    // Format: "2025-07-10T06:00:00+00:00" or "2025-07-10T06:00:00-04:00"
    const timeMatch = timeString.match(/T(\d{2}):(\d{2})/);
    if (!timeMatch) return 'N/A';
    
    const hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    
    // Format time in 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${displayHours}:${minutes} ${period}`;
  } catch {
    return 'N/A';
  }
}

function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today, tomorrow, or yesterday
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return 'Tomorrow';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }
    
    // Otherwise show day of week and date
    return format(date, 'EEE, MMM d');
  } catch {
    return 'N/A';
  }
}

export function FlightCard({
  flightData = SAMPLE_FLIGHT,
}: {
  flightData?: FlightData;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add safety checks for required data
  if (!flightData) {
    console.warn('FlightCard: No flight data provided, using sample data');
    flightData = SAMPLE_FLIGHT;
  }

  // Log the flight data structure for debugging
  console.log('🛫 FlightCard rendering with data:', {
    hasData: !!flightData,
    flightStatus: flightData?.flight_status,
    flightNumber: flightData?.flight?.iata,
    flightDate: flightData?.flight_date,
    departureTimes: {
      scheduled: flightData?.departure?.scheduled,
      estimated: flightData?.departure?.estimated,
      actual: flightData?.departure?.actual,
      delay: flightData?.departure?.delay
    },
    arrivalTimes: {
      scheduled: flightData?.arrival?.scheduled,
      estimated: flightData?.arrival?.estimated,
      actual: flightData?.arrival?.actual,
      delay: flightData?.arrival?.delay
    },
    fullData: flightData
  });

  // Provide safe fallbacks for missing data
  const safeFlightData = {
    flight_date: flightData?.flight_date || new Date().toISOString(),
    flight_status: flightData?.flight_status || 'scheduled',
    departure: {
      airport: flightData?.departure?.airport || 'Unknown Airport',
      timezone: flightData?.departure?.timezone || 'UTC',
      iata: flightData?.departure?.iata || 'XXX',
      icao: flightData?.departure?.icao || 'XXXX',
      terminal: flightData?.departure?.terminal,
      gate: flightData?.departure?.gate,
      delay: flightData?.departure?.delay,
      scheduled: flightData?.departure?.scheduled || new Date().toISOString(),
      estimated: flightData?.departure?.estimated,
      actual: flightData?.departure?.actual,
    },
    arrival: {
      airport: flightData?.arrival?.airport || 'Unknown Airport',
      timezone: flightData?.arrival?.timezone || 'UTC',
      iata: flightData?.arrival?.iata || 'XXX',
      icao: flightData?.arrival?.icao || 'XXXX',
      terminal: flightData?.arrival?.terminal,
      gate: flightData?.arrival?.gate,
      baggage: flightData?.arrival?.baggage,
      delay: flightData?.arrival?.delay,
      scheduled: flightData?.arrival?.scheduled || new Date().toISOString(),
      estimated: flightData?.arrival?.estimated,
      actual: flightData?.arrival?.actual,
    },
    airline: {
      name: flightData?.airline?.name || 'Unknown Airline',
      iata: flightData?.airline?.iata || 'XX',
      icao: flightData?.airline?.icao || 'XXX',
    },
    flight: {
      number: flightData?.flight?.number || '0000',
      iata: flightData?.flight?.iata || 'XX0000',
      icao: flightData?.flight?.icao || 'XXX0000',
    },
    aircraft: flightData?.aircraft || null,
  };

  const isActive = safeFlightData.flight_status === 'active';
  const isDelayed = (safeFlightData.departure.delay || 0) > 0 || (safeFlightData.arrival.delay || 0) > 0;
  const isCancelled = safeFlightData.flight_status === 'cancelled';

  return (
    <div
      className={cx(
        'flex flex-col gap-4 rounded-2xl p-4 max-w-[500px] text-white dark:text-white',
        {
          'bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-indigo-700 dark:to-indigo-900': safeFlightData.flight_status === 'scheduled',
          'bg-gradient-to-br from-green-600 to-green-800 dark:from-green-700 dark:to-green-900': safeFlightData.flight_status === 'active',
          'bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-700 dark:to-gray-900': safeFlightData.flight_status === 'landed',
          'bg-gradient-to-br from-red-600 to-red-800 dark:from-red-700 dark:to-red-900': safeFlightData.flight_status === 'cancelled',
          'bg-gradient-to-br from-yellow-600 to-yellow-800 dark:from-yellow-700 dark:to-yellow-900': safeFlightData.flight_status === 'diverted',
          'bg-gradient-to-br from-orange-600 to-orange-800 dark:from-orange-700 dark:to-orange-900': safeFlightData.flight_status === 'incident',
        }
      )}
    >
      {/* Header - Flight Number and Status */}
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col">
          <div className="text-2xl font-bold">
            {safeFlightData.flight.iata}
          </div>
          <div className="text-sm opacity-80">
            {safeFlightData.airline.name}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusIcon(safeFlightData.flight_status)}</span>
            <span className="text-sm font-medium">
              {getDisplayStatus(safeFlightData.flight_status)}
            </span>
          </div>
          <div className="text-sm font-medium">
            {formatDate(safeFlightData.flight_date)}
          </div>
        </div>
      </div>

      {/* Flight Route */}
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col items-center flex-1">
          <div className="text-lg font-bold">{safeFlightData.departure.iata}</div>
          <div className="text-xs opacity-80 text-center">
            {safeFlightData.departure.airport.length > 20 && isMobile 
              ? `${safeFlightData.departure.airport.substring(0, 20)}...` 
              : safeFlightData.departure.airport}
          </div>
        </div>
        
        <div className="flex flex-col items-center px-4">
          <div className="text-2xl">✈️</div>
          <div className="text-xs opacity-80">
            {safeFlightData.aircraft?.iata || 'N/A'}
          </div>
        </div>
        
        <div className="flex flex-col items-center flex-1">
          <div className="text-lg font-bold">{safeFlightData.arrival.iata}</div>
          <div className="text-xs opacity-80 text-center">
            {safeFlightData.arrival.airport.length > 20 && isMobile 
              ? `${safeFlightData.arrival.airport.substring(0, 20)}...` 
              : safeFlightData.arrival.airport}
          </div>
        </div>
      </div>

      {/* Times and Gates */}
      <div className="flex flex-row justify-between">
        <div className="flex flex-col items-center">
          <div className="text-xs opacity-80">Departure</div>
          <div className="text-sm font-medium">
            {(() => {
              // For landed flights, show actual time if available
              if (safeFlightData.flight_status === 'landed' && safeFlightData.departure.actual) {
                return formatTime(safeFlightData.departure.actual, safeFlightData.departure.timezone);
              }
              // For active flights, show actual or estimated time
              if (safeFlightData.flight_status === 'active') {
                return formatTime(safeFlightData.departure.actual || safeFlightData.departure.estimated || safeFlightData.departure.scheduled, safeFlightData.departure.timezone);
              }
              // For scheduled flights, prefer estimated over scheduled
              return formatTime(safeFlightData.departure.estimated || safeFlightData.departure.scheduled, safeFlightData.departure.timezone);
            })()}
          </div>
          {safeFlightData.departure.gate && (
            <div className="text-xs opacity-80">
              Gate {safeFlightData.departure.gate}
            </div>
          )}
          {safeFlightData.departure.delay && safeFlightData.departure.delay > 0 && (
            <div className="text-xs text-red-300">
              +{safeFlightData.departure.delay}min
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center">
          <div className="text-xs opacity-80">Arrival</div>
          <div className="text-sm font-medium">
            {(() => {
              // For landed flights, show actual time if available
              if (safeFlightData.flight_status === 'landed' && safeFlightData.arrival.actual) {
                return formatTime(safeFlightData.arrival.actual, safeFlightData.arrival.timezone);
              }
              // For active flights, show estimated time
              if (safeFlightData.flight_status === 'active') {
                return formatTime(safeFlightData.arrival.estimated || safeFlightData.arrival.scheduled, safeFlightData.arrival.timezone);
              }
              // For scheduled flights, prefer estimated over scheduled
              return formatTime(safeFlightData.arrival.estimated || safeFlightData.arrival.scheduled, safeFlightData.arrival.timezone);
            })()}
          </div>
          {safeFlightData.arrival.gate && (
            <div className="text-xs opacity-80">
              Gate {safeFlightData.arrival.gate}
            </div>
          )}
          {safeFlightData.arrival.delay && safeFlightData.arrival.delay > 0 && (
            <div className="text-xs text-red-300">
              +{safeFlightData.arrival.delay}min
            </div>
          )}
        </div>
        
        {safeFlightData.arrival.baggage && (
          <div className="flex flex-col items-center">
            <div className="text-xs opacity-80">Baggage</div>
            <div className="text-sm font-medium">
              {safeFlightData.arrival.baggage}
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {isDelayed && !isCancelled && (
        <div className="text-center text-sm bg-yellow-500/20 rounded-lg p-2">
          ⚠️ Flight delayed by {Math.max(safeFlightData.departure.delay || 0, safeFlightData.arrival.delay || 0)} minutes
        </div>
      )}
      
      {isCancelled && (
        <div className="text-center text-sm bg-red-500/20 rounded-lg p-2">
          ❌ This flight has been cancelled
        </div>
      )}
      
      {isActive && (
        <div className="text-center text-sm bg-green-500/20 rounded-lg p-2">
          ✈️ Currently in flight
        </div>
      )}
      
      {!isDelayed && !isCancelled && !isActive && safeFlightData.flight_status === 'scheduled' && (
        <div className="text-center text-sm bg-green-500/20 rounded-lg p-2">
          ✅ Flight is on time
        </div>
      )}
      
      {/* Add note about schedule times for scheduled flights */}
      {safeFlightData.flight_status === 'scheduled' && (
        <div className="text-center text-xs opacity-70 italic">
          Times shown are standard schedule. Check with airline for today's actual times.
        </div>
      )}
    </div>
  );
} 