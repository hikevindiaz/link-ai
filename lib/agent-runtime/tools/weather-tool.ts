import { AgentTool } from '../types';

interface WeatherConfig {
  apiUrl: string;
}

interface WeatherParams {
  latitude: number;
  longitude: number;
  location?: string;
}

class WeatherService {
  private config: WeatherConfig;
  
  constructor(config: WeatherConfig) {
    this.config = config;
  }
  
  async getWeather(params: WeatherParams): Promise<any> {
    const { latitude, longitude } = params;
    
    console.log('🌤️ Weather Service Request', {
      latitude,
      longitude,
      location: params.location || 'Unknown',
      apiUrl: this.config.apiUrl
    });
    
    const url = `${this.config.apiUrl}/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`;
    
    console.log('🌐 Weather API Request', {
      url: url.substring(0, 100) + '...',
      fullUrl: url
    });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Weather API Response', {
      hasData: !!data,
      current: data.current ? 'present' : 'missing',
      hourly: data.hourly ? 'present' : 'missing',
      daily: data.daily ? 'present' : 'missing'
    });
    
    return data;
  }
}

// Function to get coordinates from location name using a simple geocoding service
async function getCoordinatesFromLocation(location: string): Promise<{ latitude: number; longitude: number }> {
  try {
    console.log('🌍 Geocoding request for:', location);
    
    // Try different search variations for better results
    const searchTerms = [
      location,
      location.replace(/,.*$/, ''), // Remove everything after comma
      location.split(',')[0].trim() // Get just the city name
    ];
    
    for (const searchTerm of searchTerms) {
      console.log('🔍 Trying search term:', searchTerm);
      
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=en&format=json`);
      
      if (!response.ok) {
        console.error('Geocoding API error:', response.status, response.statusText);
        continue;
      }
      
      const data = await response.json();
      console.log('🌍 Geocoding response:', { 
        searchTerm, 
        resultsCount: data.results?.length || 0,
        results: data.results?.map((r: any) => ({ name: r.name, country: r.country, admin1: r.admin1 })) || []
      });
      
      if (data.results && data.results.length > 0) {
        // Prefer exact matches or matches with the original location context
        let result = data.results[0];
        
        // If searching for a place like "Ponce, Puerto Rico", prefer PR results
        if (location.toLowerCase().includes('puerto rico') || location.toLowerCase().includes('pr')) {
          const prResult = data.results.find((r: any) => 
            r.country_code === 'PR' || 
            r.country === 'Puerto Rico' ||
            r.admin1 === 'Puerto Rico'
          );
          if (prResult) result = prResult;
        }
        
        console.log('✅ Selected geocoding result:', {
          name: result.name,
          country: result.country,
          admin1: result.admin1,
          latitude: result.latitude,
          longitude: result.longitude
        });
        
        return {
          latitude: result.latitude,
          longitude: result.longitude
        };
      }
    }
    
    // If all search terms failed, throw error
    throw new Error(`Location not found: ${location}`);
    
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error(`Could not find coordinates for location: ${location}`);
  }
}

export const weatherTool: AgentTool = {
  id: 'weather',
  name: 'getWeather',
  description: 'Get current weather information for a location. Can accept either coordinates (latitude/longitude) or a location name.',
  parameters: {
    type: 'object',
    properties: {
      latitude: {
        type: 'number',
        description: 'Latitude coordinate (e.g., 37.7749 for San Francisco)'
      },
      longitude: {
        type: 'number',
        description: 'Longitude coordinate (e.g., -122.4194 for San Francisco)'
      },
      location: {
        type: 'string',
        description: 'Location name (e.g., "San Francisco", "New York", "London"). Will be used to get coordinates if latitude/longitude not provided.'
      }
    },
    required: []
  },
  systemPrompt: `# Weather Tool Available
I have access to the getWeather tool for current weather information.

## When to Use Weather Tool:
- Users ask for current weather conditions
- Users want temperature information
- Users need weather forecasts
- Users ask about weather in specific locations

## Available Parameters:
- **location**: Location name (e.g., "San Francisco", "New York", "London")
- **latitude/longitude**: Exact coordinates (alternative to location)

## Usage Guidelines:
- Use location names when possible for better user experience
- The tool supports both location names and coordinates
- Provides current conditions and hourly forecasts
- Returns comprehensive weather data including temperature, humidity, wind speed

## Examples:
- "What's the weather like in San Francisco?" → use with location: "San Francisco"
- "Current temperature in New York" → use with location: "New York"
- "Weather forecast for London" → use with location: "London"`,
  handler: async (args: any, context: any) => {
    console.log('🌤️ Weather Tool Invoked', {
      hasLatitude: typeof args.latitude === 'number',
      hasLongitude: typeof args.longitude === 'number',
      hasLocation: typeof args.location === 'string',
      location: args.location,
      coordinates: args.latitude && args.longitude ? `${args.latitude},${args.longitude}` : 'none'
    });
    
    const service = new WeatherService({
      apiUrl: 'https://api.open-meteo.com'
    });
    
    try {
      let latitude: number, longitude: number;
      let locationName = args.location;
      
      // Get coordinates either from direct input or by geocoding location
      if (args.latitude && args.longitude) {
        latitude = args.latitude;
        longitude = args.longitude;
      } else if (args.location) {
        const coords = await getCoordinatesFromLocation(args.location);
        latitude = coords.latitude;
        longitude = coords.longitude;
        locationName = args.location;
      } else {
        throw new Error('Either coordinates (latitude/longitude) or location name must be provided');
      }
      
      const result = await service.getWeather({
        latitude,
        longitude,
        location: locationName
      });
      
      // Format response for better readability and UI rendering
      const response = {
        success: true,
        location: locationName || `${latitude}, ${longitude}`,
        coordinates: { latitude, longitude },
        current: result.current,
        hourly: result.hourly,
        daily: result.daily,
        units: {
          current: result.current_units,
          hourly: result.hourly_units,
          daily: result.daily_units
        },
        metadata: {
          timezone: result.timezone,
          timezone_abbreviation: result.timezone_abbreviation,
          elevation: result.elevation,
          generation_time_ms: result.generationtime_ms,
          timestamp: new Date().toISOString()
        },
        // Add UI rendering support for weather cards
        ui: {
          type: 'weather-card',
          data: {
            latitude,
            longitude,
            generationtime_ms: result.generationtime_ms,
            utc_offset_seconds: result.utc_offset_seconds,
            timezone: result.timezone,
            timezone_abbreviation: result.timezone_abbreviation,
            elevation: result.elevation,
            current_units: result.current_units,
            current: result.current,
            hourly_units: result.hourly_units,
            hourly: result.hourly,
            daily_units: result.daily_units,
            daily: result.daily
          }
        }
      };
      
      console.log('✅ Weather Tool Response', {
        success: true,
        location: response.location,
        currentTemp: result.current?.temperature_2m,
        hasHourlyData: !!result.hourly,
        hasDailyData: !!result.daily
      });
      
      return response;
      
    } catch (error) {
      console.error('❌ Weather Tool Error', {
        error: error.message,
        location: args.location,
        coordinates: args.latitude && args.longitude ? `${args.latitude},${args.longitude}` : 'none'
      });
      
      return {
        success: false,
        error: error.message,
        location: args.location || `${args.latitude}, ${args.longitude}`,
        summary: `Failed to get weather: ${error.message}`
      };
    }
  }
}; 