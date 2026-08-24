export type ToolStatus =
  | 'thinking'
  | 'web_search'
  | 'phil_guidance'
  | 'cla_guidance'
  | 'both_guidance';

export type ToolUsed = 'web_search' | 'phil_guidance' | 'cla_guidance';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{
    title: string;
    url: string;
  }>;
  suggestions?: string[];
  toolsUsed?: ToolUsed[];
  isError?: boolean;
  attachment?: {
    fileName: string;
    type: 'eml';
  };
}
