import { AgentTool } from '../types';

interface AviationStackConfig {
  apiKey: string;
  baseUrl: string;
}

interface FlightSearchParams {
  flight_number?: string;
  flight_iata?: string;
  flight_icao?: string;
  dep_iata?: string;
  arr_iata?: string;
  airline_iata?: string;
  flight_status?: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted';
  limit?: number;
  // NOTE: flight_date removed - free plan cannot filter by any dates (past, present, or future)
}

interface AirportSearchParams {
  search?: string;
  limit?: number;
}

interface AirlineSearchParams {
  search?: string;
  limit?: number;
}

class AviationStackService {
  private config: AviationStackConfig;

  constructor(config: AviationStackConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    
    // Add access key and other parameters
    url.searchParams.append('access_key', this.config.apiKey);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log('🛫 Making AviationStack API request', { endpoint, params });
    console.log('🔗 API URL Details', { 
      fullUrl: url.toString(),
      hasAccessKey: url.searchParams.has('access_key'),
      accessKeyLength: url.searchParams.get('access_key')?.length || 0,
      accessKeyPreview: url.searchParams.get('access_key')?.substring(0, 8) + '...' || 'NONE'
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'LinkAI-Agent/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`AviationStack API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`AviationStack API error: ${data.error.message || data.error.code}`);
      }

      console.log('✅ AviationStack API response received', { 
        endpoint, 
        dataCount: data.data?.length || 0,
        pagination: data.pagination
      });

      return data;
    } catch (error) {
      console.error('❌ AviationStack API request failed', { endpoint, error: error.message });
      throw error;
    }
  }

  async searchFlights(params: FlightSearchParams): Promise<any> {
    return this.makeRequest('flights', params);
  }

  async searchAirports(params: AirportSearchParams): Promise<any> {
    return this.makeRequest('airports', params);
  }

  async searchAirlines(params: AirlineSearchParams): Promise<any> {
    return this.makeRequest('airlines', params);
  }

  async getRoutes(params: { dep_iata?: string; arr_iata?: string; airline_iata?: string; limit?: number }): Promise<any> {
    return this.makeRequest('routes', params);
  }

  async getCities(params: { search?: string; limit?: number }): Promise<any> {
    return this.makeRequest('cities', params);
  }

  async getCountries(params: { search?: string; limit?: number }): Promise<any> {
    return this.makeRequest('countries', params);
  }
}

// Helper function to parse flight numbers from various formats
function parseFlightNumber(input: string): { flight_iata?: string; flight_number?: string } {
  if (!input) return {};
  
  // Clean the input - handle various space types and special characters
  const cleaned = input
    .trim()
    .replace(/\u00A0/g, ' ')  // Replace non-breaking spaces
    .replace(/\s+/g, ' ')     // Normalize multiple spaces to single space
    .toUpperCase();
  
  // Debug logging with character codes to detect invisible characters
  console.log(`🔍 Parsing flight number input: "${input}" → cleaned: "${cleaned}"`);
  console.log(`🔍 Character codes:`, cleaned.split('').map(c => `${c}:${c.charCodeAt(0)}`).join(' '));
  
  // Pattern 1: "F9 3546" or "AA 1234" (airline code + space + number)
  const spacePattern = /^([A-Z]{1,3})\s+(\d+)$/;
  const spaceMatch = cleaned.match(spacePattern);
  console.log(`🔍 Space pattern test:`, { pattern: spacePattern.toString(), matches: !!spaceMatch, match: spaceMatch });
  if (spaceMatch) {
    const [, airline, number] = spaceMatch;
    const flightIata = `${airline}${number}`;
    console.log(`✈️ Parsed flight number: "${input}" → "${flightIata}"`);
    return { flight_iata: flightIata, flight_number: number };
  }
  
  // Pattern 2: "F93546" or "AA1234" (already combined)
  const combinedPattern = /^([A-Z]{1,3})(\d+)$/;
  const combinedMatch = cleaned.match(combinedPattern);
  if (combinedMatch) {
    const [, airline, number] = combinedMatch;
    const flightIata = cleaned;
    console.log(`✈️ Flight number already in IATA format: "${flightIata}"`);
    return { flight_iata: flightIata, flight_number: number };
  }
  
  // Pattern 3: Just numbers "3546" 
  const numberOnlyPattern = /^\d+$/;
  if (numberOnlyPattern.test(cleaned)) {
    console.log(`✈️ Flight number only (no airline): "${cleaned}"`);
    return { flight_number: cleaned };
  }
  
  // Pattern 4: Try to handle any format with letters followed by numbers with optional spaces
  const flexiblePattern = /^([A-Z]{1,3})\s*(\d+)$/;
  const flexibleMatch = cleaned.match(flexiblePattern);
  if (flexibleMatch) {
    const [, airline, number] = flexibleMatch;
    const flightIata = `${airline}${number}`;
    console.log(`✈️ Parsed flight number (flexible): "${input}" → "${flightIata}"`);
    return { flight_iata: flightIata, flight_number: number };
  }
  
  // If no pattern matches, try to remove spaces and see if it's a valid flight code
  const noSpaces = cleaned.replace(/\s+/g, '');
  if (/^[A-Z]{1,3}\d+$/.test(noSpaces)) {
    console.log(`✈️ Parsed by removing spaces: "${input}" → "${noSpaces}"`);
    return { flight_iata: noSpaces };
  }
  
  // Final fallback - don't return anything that won't work
  console.log(`❌ Could not parse flight format: "${cleaned}"`);
  return {};
}

export const aviationStackTool: AgentTool = {
  id: 'aviationstack',
  name: 'aviationstack',
  description: 'Search for flight information using AviationStack API. Returns recent flight data without date filtering. Cannot query specific dates due to free plan limitations.',
  parameters: {
    type: 'object',
    properties: {
      // Flight search parameters for real-time data only
      flight_number: {
        type: 'string',
        description: 'Flight number to search for (e.g., "1004", "3546"). Can also accept full flight codes like "F9 3546".'
      },
      flight_iata: {
        type: 'string',
        description: 'IATA flight code to search for (e.g., "AA1004", "F9 3546", "United 567"). Can include spaces between airline and number.'
      },
      flight_icao: {
        type: 'string',
        description: 'ICAO flight code to search for (e.g., "AAL1004")'
      },
      dep_iata: {
        type: 'string',
        description: 'Departure airport IATA code (e.g., "SFO", "JFK")'
      },
      arr_iata: {
        type: 'string',
        description: 'Arrival airport IATA code (e.g., "LAX", "DFW")'
      },
      airline_iata: {
        type: 'string',
        description: 'Airline IATA code to filter by (e.g., "AA")'
      },
      flight_status: {
        type: 'string',
        enum: ['scheduled', 'active', 'landed', 'cancelled', 'incident', 'diverted'],
        description: 'Filter flights by current status'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10, max: 100)',
        default: 10
      }
    },
    required: []
  },
  systemPrompt: `# Aviation Stack Tool Available
I have access to the aviationstack tool for REAL-TIME flight information only.

## IMPORTANT LIMITATIONS:
- **NO DATE FILTERING**: Cannot query flights by specific dates (past, present, or future)
- **MIXED TIMEFRAME**: Returns a mix of recent flights (active, scheduled, recently completed)
- **FREE PLAN RESTRICTION**: Cannot filter by date, even for future scheduled flights
- **FLIGHT SCHEDULES**: Cannot guarantee tomorrow's flights will appear - depends on airline reporting

## When to Use Aviation Stack Tool:
- Users ask for specific flight status by flight number (e.g., "AA1234", "F9 3546")
- Users need flight information by route (e.g., "flights from LAX to JFK")
- Users want to check flights by airline (e.g., "Spirit Airlines flights")
- Users ask about flight status without specifying dates

## DO NOT USE Aviation Stack Tool For:
- Flights on specific dates (past, present, or future)
- "Tomorrow's flights" or "flights on [date]" queries
- Historical flight data or archived records
- Flight schedules or timetables for specific dates

## Available Parameters:
- **flight_number**: Flight number (e.g., "1004")
- **flight_iata**: IATA flight code (e.g., "AA1004")
- **flight_icao**: ICAO flight code (e.g., "AAL1004")
- **dep_iata**: Departure airport IATA code (e.g., "SFO", "JFK")
- **arr_iata**: Arrival airport IATA code (e.g., "LAX", "DFW")
- **airline_iata**: Airline IATA code (e.g., "AA")
- **flight_status**: Filter by status (scheduled, active, landed, cancelled, incident, diverted)
- **limit**: Number of results (default: 10, max: 100)

## Usage Guidelines:
- Use specific flight numbers when available
- When users provide flight numbers with spaces (e.g., "F9 3546", "AA 1234"), pass them AS-IS to flight_iata parameter - the tool will handle parsing
- Use IATA codes for airports when possible (e.g., "LAX", "JFK", "DFW")
- Only query for current or future flights
- Always provide helpful context in your responses
- If a flight is delayed or cancelled, provide alternative suggestions when possible
- NEVER show raw JSON responses to users - always format the information in a user-friendly way

## Examples:
- "Check flight AA1234 status" → use with flight_iata: "AA1234"
- "Check F9 3546" → use with flight_iata: "F9 3546" (with the space)
- "Status for flight F9 3546" → use with flight_iata: "F9 3546" (with the space)
- "Flights from LAX to JFK" → use with dep_iata: "LAX", arr_iata: "JFK"
- "Spirit Airlines flights" → use with airline_iata: "F9"
- "Status of United flight 567" → use with flight_iata: "United 567"

## Error Handling:
- If users ask for flights on specific dates, explain that date filtering is not available
- For future flights: Suggest checking airline websites or apps for tomorrow's schedule
- For past flights: Explain that historical data requires airline websites or apps
- Focus on flight number/route queries without date constraints
- If no flights are found: Provide a helpful explanation, NOT raw data. Example: "I couldn't find flight F9 3546 in the current data. This could mean the flight isn't currently active or scheduled for today. Would you like me to help you check another flight?"`,
  handler: async (args: any, context: any) => {
    // Get API key from environment
    const apiKey = process.env.AVIATIONSTACK_API_KEY;
    console.log('🔑 AviationStack API Key Check', {
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'NONE',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('AVIATION'))
    });
    
    if (!apiKey) {
      throw new Error('AviationStack API key not configured. Please set AVIATIONSTACK_API_KEY environment variable.');
    }

    const service = new AviationStackService({
      apiKey,
      baseUrl: 'https://api.aviationstack.com/v1'
    });

    try {
      // Parse flight number if provided in various formats
      let searchParams: FlightSearchParams = {
        dep_iata: args.dep_iata,
        arr_iata: args.arr_iata,
        airline_iata: args.airline_iata,
        flight_status: args.flight_status,
        limit: args.limit || 10
      };
      
      // Handle flight number/IATA parsing
      if (args.flight_iata || args.flight_number) {
        const flightInput = args.flight_iata || args.flight_number;
        const parsed = parseFlightNumber(flightInput);
        
        // Apply parsed values, preferring IATA format
        if (parsed.flight_iata) {
          searchParams.flight_iata = parsed.flight_iata;
        } else if (parsed.flight_number) {
          searchParams.flight_number = parsed.flight_number;
        }
      }
      
      // If flight_icao provided, use it directly
      if (args.flight_icao) {
        searchParams.flight_icao = args.flight_icao;
      }
      
      console.log('🔍 Flight search parameters:', searchParams);
      
      // Search for flights without date filtering (free plan limitation)
      const result = await service.searchFlights(searchParams);

      // Format response for better readability
      const response = {
        success: true,
        data: result.data || [],
        pagination: result.pagination || null,
        summary: `Found ${result.data?.length || 0} flight(s) - mix of recent flights without date filtering`,
        metadata: {
          total: result.pagination?.total || result.data?.length || 0,
          returned: result.data?.length || 0,
          timestamp: new Date().toISOString(),
          dataType: 'mixed-timeframe',
          limitation: 'Free plan: cannot filter by specific dates'
        },
        // Add UI rendering support for flight cards
        ui: result.data?.length > 0 ? {
          type: 'flight-cards',
          flights: result.data.map((flight: any) => ({
            flight_date: flight.flight_date,
            flight_status: flight.flight_status,
            departure: flight.departure,
            arrival: flight.arrival,
            airline: flight.airline,
            flight: flight.flight,
            aircraft: flight.aircraft || null
          }))
        } : null
      };

      return response;
    } catch (error) {
      console.error('❌ AviationStack tool error', { error: error.message });
      return {
        success: false,
        error: error.message,
        data: [],
        summary: `Failed to search flights: ${error.message}`,
        limitation: 'Free plan: cannot filter by specific dates'
      };
    }
  }
}; 