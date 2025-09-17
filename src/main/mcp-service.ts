import { MCPTool } from '../shared/types';

export class MCPService {
  private tools: Map<string, MCPTool> = new Map();

  constructor() {
    this.initializeBuiltInTools();
  }

  private initializeBuiltInTools() {
    // Add some built-in MCP tools
    const builtInTools: MCPTool[] = [
      {
        name: 'file-reader',
        enabled: false,
        config: {
          description: 'Read files from the local filesystem',
          allowedPaths: ['~/Documents', '~/Downloads'],
        },
      },
      {
        name: 'web-search',
        enabled: false,
        config: {
          description: 'Search the web for information',
          provider: 'duckduckgo',
          maxResults: 5,
        },
      },
      {
        name: 'calculator',
        enabled: false,
        config: {
          description: 'Perform mathematical calculations',
          precision: 10,
        },
      },
    ];

    builtInTools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });
  }

  getAvailableTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getEnabledTools(): MCPTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.enabled);
  }

  updateTool(toolName: string, updates: Partial<MCPTool>): void {
    const existingTool = this.tools.get(toolName);
    if (existingTool) {
      this.tools.set(toolName, { ...existingTool, ...updates });
    }
  }

  addTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  removeTool(toolName: string): void {
    this.tools.delete(toolName);
  }

  // This would integrate with the actual MCP SDK when implementing tool calls
  async executeTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool || !tool.enabled) {
      throw new Error(`Tool ${toolName} is not available or disabled`);
    }

    // Placeholder for actual MCP tool execution
    // In a real implementation, this would use the MCP SDK to execute tools
    switch (toolName) {
      case 'calculator':
        return this.executeCalculator(parameters);
      case 'web-search':
        return this.executeWebSearch(parameters);
      case 'file-reader':
        return this.executeFileReader(parameters);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async executeCalculator(parameters: Record<string, any>): Promise<any> {
    // Safe calculator implementation
    const { expression } = parameters;
    try {
      const result = this.safeMathEvaluator(expression);
      return { result, expression };
    } catch (error) {
      throw new Error(`Calculator error: ${error}`);
    }
  }

  private safeMathEvaluator(expression: string): number {
    // Remove all whitespace
    const cleanExpression = expression.replace(/\s/g, '');
    
    // Validate that the expression only contains allowed characters
    const allowedChars = /^[0-9+\-*/.()]+$/;
    if (!allowedChars.test(cleanExpression)) {
      throw new Error('Invalid characters in expression. Only numbers, +, -, *, /, ., and parentheses are allowed.');
    }
    
    // Check for potential security issues
    if (cleanExpression.includes('..') || cleanExpression.includes('//')) {
      throw new Error('Invalid expression format');
    }
    
    // Validate parentheses are balanced
    let parenCount = 0;
    for (const char of cleanExpression) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) throw new Error('Mismatched parentheses');
    }
    if (parenCount !== 0) throw new Error('Mismatched parentheses');
    
    // Parse and evaluate the expression safely
    return this.parseExpression(cleanExpression);
  }

  private parseExpression(expr: string): number {
    // Simple recursive descent parser for basic arithmetic
    const tokens = this.tokenize(expr);
    let index = 0;
    
    const peek = () => tokens[index];
    const consume = () => tokens[index++];
    
    const parseNumber = (): number => {
      const token = consume();
      if (token === undefined) throw new Error('Unexpected end of expression');
      
      if (token === '-') {
        return -parseNumber();
      }
      
      const num = parseFloat(token);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${token}`);
      }
      return num;
    };

    const parseFactor = (): number => {
      if (peek() === '(') {
        consume(); // consume '('
        const result = parseExpr();
        if (consume() !== ')') {
          throw new Error('Expected closing parenthesis');
        }
        return result;
      } else {
        return parseNumber();
      }
    };

    const parseTerm = (): number => {
      let result = parseFactor();
      while (peek() === '*' || peek() === '/') {
        const op = consume();
        const right = parseFactor();
        if (op === '*') {
          result *= right;
        } else {
          if (right === 0) {
            throw new Error('Division by zero');
          }
          result /= right;
        }
      }
      return result;
    };

    const parseExpr = (): number => {
      let result = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseTerm();
        if (op === '+') {
          result += right;
        } else {
          result -= right;
        }
      }
      return result;
    };

    const result = parseExpr();
    if (index < tokens.length) {
      throw new Error('Unexpected characters at end of expression');
    }
    return result;
  }

  private tokenize(expr: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    
    while (i < expr.length) {
      const char = expr[i];
      
      if (char.match(/[+\-*/()]/)) {
        tokens.push(char);
        i++;
      } else if (char.match(/[0-9.]/)) {
        let num = '';
        let hasDecimal = false;
        while (i < expr.length && expr[i].match(/[0-9.]/)) {
          if (expr[i] === '.') {
            if (hasDecimal) {
              throw new Error('Invalid number format: multiple decimal points');
            }
            hasDecimal = true;
          }
          num += expr[i++];
        }
        tokens.push(num);
      } else {
        throw new Error(`Unexpected character: ${char}`);
      }
    }
    
    return tokens;
  }

  private async executeWebSearch(parameters: Record<string, any>): Promise<any> {
    // Placeholder for web search
    const { query } = parameters;
    return {
      query,
      results: [
        { title: 'Example Result', url: 'https://example.com', snippet: 'This is a placeholder result' }
      ]
    };
  }

  private async executeFileReader(parameters: Record<string, any>): Promise<any> {
    // Placeholder for file reading
    const { path } = parameters;
    return {
      path,
      content: 'This is placeholder file content',
      error: 'File reading not implemented yet'
    };
  }
}