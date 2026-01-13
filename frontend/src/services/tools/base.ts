export interface ToolParameters {
  [key: string]: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ToolSchema {
  type: string;
  properties: {
    [key: string]: {
      type: string;
      enum?: string[];
      description?: string;
      default?: any;
    };
  };
  required?: string[];
}

export abstract class ClientTool {
  public readonly name: string;
  public readonly description: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  abstract getSchema(): ToolSchema;
  abstract execute(parameters: ToolParameters): Promise<ToolResult>;

  protected createSuccessResult(data: any): ToolResult {
    return {
      success: true,
      data
    };
  }

  protected createErrorResult(error: string): ToolResult {
    return {
      success: false,
      error
    };
  }
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ClientTool> = new Map();

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public register(tool: ClientTool): void {
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ClientTool | undefined {
    return this.tools.get(name);
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public getAllTools(): ClientTool[] {
    return Array.from(this.tools.values());
  }
}