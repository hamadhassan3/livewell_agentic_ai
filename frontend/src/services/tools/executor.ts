import apiClient from '@/api/apiClient';
import { ToolRegistry, ClientTool } from './base';
import { GetCurrentLocationTool } from './implementations/location';
import { GetCurrentTimeTool } from './implementations/time';

export interface ToolRequest {
  request_id: number;
  tool_name: string;
  parameters: Record<string, any>;
  status: string;
  conversation: number;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ToolResponseData {
  message: string;
  tool_request: ToolRequest;
  ai_response?: string;
  all_tools_completed?: boolean;
  type?: string;
  error?: string;
}

export class ToolExecutor {
  private static instance: ToolExecutor;
  private registry: ToolRegistry;
  private baseURL: string;

  private constructor() {
    this.registry = ToolRegistry.getInstance();
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    this.initializeTools();
  }

  private initializeTools(): void {
    this.registry.register(new GetCurrentLocationTool());
    this.registry.register(new GetCurrentTimeTool());
  }

  public static getInstance(): ToolExecutor {
    if (!ToolExecutor.instance) {
      ToolExecutor.instance = new ToolExecutor();
    }
    return ToolExecutor.instance;
  }

  public async executeToolRequests(toolRequests: ToolRequest[]): Promise<ToolResponseData[]> {
    const results: ToolResponseData[] = [];

    for (const request of toolRequests) {
      const result = await this.executeToolRequest(request);
      results.push(result);
    }

    return results;
  }

  private async executeToolRequest(request: ToolRequest): Promise<ToolResponseData> {
    try {
      const tool = this.registry.get(request.tool_name);
      
      if (!tool) {
        return await this.submitToolResponse(request.request_id, null, `Tool ${request.tool_name} not found`);
      }

      console.log(`Found tool: ${tool.name}, executing...`);
      const result = await tool.execute(request.parameters);
      
      if (result.success) {
        return await this.submitToolResponse(request.request_id, result.data, null);
      } else {
        return await this.submitToolResponse(request.request_id, null, result.error || 'Tool execution failed');
      }
    } catch (error: any) {
      return await this.submitToolResponse(
        request.request_id, 
        null, 
        error?.message || 'Unexpected error during tool execution'
      );
    }
  }

  private async submitToolResponse(
    requestId: number, 
    result: any | null, 
    errorMessage: string | null
  ): Promise<ToolResponseData> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await apiClient.post(
        `/tools/requests/${requestId}/response/`,
        {
          request_id: requestId,
          result: result,
          error_message: errorMessage
        },
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to submit tool response:', error);
      
      return {
        message: 'Failed to submit tool response',
        tool_request: {
          request_id: requestId,
          tool_name: '',
          parameters: {},
          status: 'failed',
          conversation: 0,
          created_at: new Date().toISOString()
        },
        error: error?.response?.data?.error || error?.message || 'Network error'
      };
    }
  }

  public registerTool(tool: ClientTool): void {
    this.registry.register(tool);
  }

  public getTool(name: string): ClientTool | undefined {
    return this.registry.get(name);
  }

  public hasTool(name: string): boolean {
    return this.registry.has(name);
  }
}