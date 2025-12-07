import type { Tool, ToolExecutionResult } from '../types.js';

export const fetchUrlTool: Tool = {
  name: 'fetch_url',
  description: 'Fetch content from a URL. Returns the page content as text.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch',
      },
      maxLength: {
        type: 'number',
        default: 50000,
        description: 'Maximum content length to return (default: 50000 characters)',
      },
    },
    required: ['url'],
  },
  permission: 'auto',
  async execute(params): Promise<ToolExecutionResult> {
    const url = params.url as string;
    const maxLength = (params.maxLength as number) || 50000;

    try {
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          success: false,
          error: 'Only HTTP and HTTPS URLs are supported',
        };
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ManuCode/1.0',
          Accept: 'text/html,application/json,text/plain,*/*',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error: ${response.status} ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let content: string;

      if (contentType.includes('application/json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
      } else {
        content = await response.text();
      }

      // Truncate if too long
      if (content.length > maxLength) {
        content = content.slice(0, maxLength) + '\n\n[Content truncated...]';
      }

      // Basic HTML to text conversion for HTML content
      if (contentType.includes('text/html')) {
        content = htmlToText(content);
      }

      return {
        success: true,
        output: content,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch URL: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

function htmlToText(html: string): string {
  return html
    // Remove script and style tags with content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Replace block elements with newlines
    .replace(/<(\/?(div|p|br|h[1-6]|li|tr|td|th|blockquote|pre))[^>]*>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

export const webTools = [fetchUrlTool];
