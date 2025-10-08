/**
 * Hello Service
 * Contains business logic for hello world functionality using function-based approach
 */

export interface ServerInfo {
  name: string;
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Get a basic hello world message
 * @returns {Promise<string>} Hello world message
 */
export const getHelloMessage = async (): Promise<string> => {
  return new Promise((resolve) => {
    // Simulate async operation
    setTimeout(() => {
      resolve('Hello, World! Welcome to the Express.js TypeScript API');
    }, 100);
  });
};

/**
 * Get a personalized hello message
 * @param {string} name - The name to personalize the message with
 * @returns {Promise<string>} Personalized hello message
 */
export const getPersonalizedMessage = async (name: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      reject(new Error('Name is required and must be a non-empty string'));
      return;
    }

    // Simulate async operation
    setTimeout(() => {
      const sanitizedName: string = name.trim();
      resolve(`Hello, ${sanitizedName}! Welcome to the Express.js TypeScript API`);
    }, 100);
  });
};

/**
 * Get server information
 * @returns {ServerInfo} Server information object
 */
export const getServerInfo = (): ServerInfo => {
  return {
    name: 'Zero Light Privy API',
    version: '1.0.0',
    environment: process.env['NODE_ENV'] || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
};

/**
 * Validate name input
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidName = (name: string): boolean => {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 50;
};
