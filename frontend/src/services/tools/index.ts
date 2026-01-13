export { ClientTool, ToolRegistry, ToolResult, ToolParameters, ToolSchema } from './base';
export { ToolExecutor, ToolRequest, ToolResponseData } from './executor';

export function getToolExecutor(): ToolExecutor {
  // Lazy import to avoid circular dependencies
  const { ToolExecutor } = require('./executor');
  return ToolExecutor.getInstance();
}