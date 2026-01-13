import * as Location from 'expo-location';
import { ClientTool, ToolParameters, ToolResult, ToolSchema } from '../base';

export class GetCurrentLocationTool extends ClientTool {
  constructor() {
    super(
      'get_current_location',
      "Retrieve user's GPS location from device"
    );
  }

  getSchema(): ToolSchema {
    return {
      type: 'object',
      properties: {
        precision: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'GPS precision level',
          default: 'medium'
        }
      },
      required: []
    };
  }

  async execute(parameters: ToolParameters): Promise<ToolResult> {
    try {
      const precision = parameters.precision || 'medium';
      
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return this.createErrorResult('Location permission denied by user');
      }

      // Configure accuracy based on precision
      let accuracy: Location.LocationAccuracy;
      switch (precision) {
        case 'high':
          accuracy = Location.LocationAccuracy.Highest;
          break;
        case 'low':
          accuracy = Location.LocationAccuracy.Lowest;
          break;
        case 'medium':
        default:
          accuracy = Location.LocationAccuracy.Balanced;
          break;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy,
      });
      
      return this.createSuccessResult({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
        precision: precision
      });
    } catch (error) {
      return this.createErrorResult(this.getLocationErrorMessage(error));
    }
  }

  private getLocationErrorMessage(error: any): string {
    if (error?.code === 'E_LOCATION_UNAVAILABLE') {
      return 'Location information is unavailable';
    } else if (error?.code === 'E_LOCATION_TIMEOUT') {
      return 'Location request timed out';
    } else if (error?.code === 'E_LOCATION_UNAUTHORIZED') {
      return 'Location permission denied';
    }
    return error?.message || 'Failed to get location';
  }
}