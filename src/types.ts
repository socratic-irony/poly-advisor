export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{
    title: string;
    url: string;
  }>;
  suggestions?: string[];
  isError?: boolean;
  attachment?: {
    fileName: string;
    type: 'eml';
  };
}
