import { ClientTool, ToolParameters, ToolResult, ToolSchema } from '../base';

export class GetCurrentTimeTool extends ClientTool {
  constructor() {
    super(
      'get_current_time',
      'Get the current date and time from the device'
    );
  }

  getSchema(): ToolSchema {
    return {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: "Timezone to use (e.g., 'UTC', 'America/New_York', 'local')",
          default: 'local'
        },
        format: {
          type: 'string',
          enum: ['iso', 'unix', 'readable'],
          description: 'Time format to return',
          default: 'readable'
        }
      },
      required: []
    };
  }

  async execute(parameters: ToolParameters): Promise<ToolResult> {
    try {
      const timezone = parameters.timezone || 'local';
      const format = parameters.format || 'readable';
      
      let currentDate: Date;
      
      // Get current date based on timezone
      if (timezone === 'local') {
        currentDate = new Date();
      } else if (timezone === 'UTC') {
        currentDate = new Date();
        // Convert to UTC
        currentDate = new Date(currentDate.toUTCString());
      } else {
        // For specific timezones, we'll use Intl.DateTimeFormat
        currentDate = new Date();
      }

      let formattedTime: string | number;
      let dateInfo: any = {
        timestamp: currentDate.getTime(),
        timezone: timezone,
        format: format
      };

      // Format the date based on requested format
      switch (format) {
        case 'unix':
          formattedTime = Math.floor(currentDate.getTime() / 1000);
          dateInfo.unix = formattedTime;
          dateInfo.milliseconds = currentDate.getTime();
          break;
          
        case 'iso':
          formattedTime = currentDate.toISOString();
          dateInfo.iso = formattedTime;
          break;
          
        case 'readable':
        default:
          // Use locale-specific formatting
          if (timezone === 'local' || timezone === 'UTC') {
            formattedTime = currentDate.toLocaleString();
            dateInfo.readable = formattedTime;
            dateInfo.date = currentDate.toLocaleDateString();
            dateInfo.time = currentDate.toLocaleTimeString();
          } else {
            // Try to format with specific timezone
            try {
              const options: Intl.DateTimeFormatOptions = {
                timeZone: timezone,
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
              };
              formattedTime = currentDate.toLocaleString('en-US', options);
              dateInfo.readable = formattedTime;
              
              const dateOptions: Intl.DateTimeFormatOptions = {
                timeZone: timezone,
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              };
              const timeOptions: Intl.DateTimeFormatOptions = {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
              };
              dateInfo.date = currentDate.toLocaleString('en-US', dateOptions);
              dateInfo.time = currentDate.toLocaleString('en-US', timeOptions);
            } catch (tzError) {
              // Invalid timezone, fallback to local
              formattedTime = currentDate.toLocaleString();
              dateInfo.readable = formattedTime;
              dateInfo.date = currentDate.toLocaleDateString();
              dateInfo.time = currentDate.toLocaleTimeString();
              dateInfo.timezone_error = `Invalid timezone '${timezone}', using local time`;
            }
          }
          break;
      }

      // Add additional date components
      dateInfo.year = currentDate.getFullYear();
      dateInfo.month = currentDate.getMonth() + 1; // 0-indexed
      dateInfo.day = currentDate.getDate();
      dateInfo.hour = currentDate.getHours();
      dateInfo.minute = currentDate.getMinutes();
      dateInfo.second = currentDate.getSeconds();
      dateInfo.dayOfWeek = currentDate.getDay(); // 0 = Sunday
      dateInfo.dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
      
      // Add timezone offset
      const offsetMinutes = currentDate.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const offsetSign = offsetMinutes <= 0 ? '+' : '-';
      dateInfo.timezoneOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
      
      return this.createSuccessResult(dateInfo);
      
    } catch (error: any) {
      return this.createErrorResult(
        error?.message || 'Failed to get current time'
      );
    }
  }
}