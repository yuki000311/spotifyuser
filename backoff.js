/**
 * Exponential backoff utility for API requests
 * Handles rate limiting and network issues with configurable retry logic
 */

const axios = require('axios');

/**
 * Exponential backoff configuration
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,          // Maximum number of retry attempts
  baseDelay: 1000,        // Base delay in milliseconds (1 second)
  maxDelay: 30000,        // Maximum delay in milliseconds (30 seconds)
  jitterFactor: 0.1       // Jitter factor to prevent thundering herd (10%)
};

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @param {object} config - Configuration object
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, config = DEFAULT_CONFIG) {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  
  // Apply maximum delay cap
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * Math.random();
  
  return Math.floor(cappedDelay + jitter);
}

/**
 * Check if error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} True if error should be retried
 */
function isRetryableError(error) {
  if (!error.response) {
    // Network errors (no response) are retryable
    return true;
  }
  
  const status = error.response.status;
  
  // Retry on rate limiting, server errors, and specific client errors
  return status === 429 ||         // Too Many Requests (rate limiting)
         status === 503 ||         // Service Unavailable
         status === 502 ||         // Bad Gateway
         status === 504 ||         // Gateway Timeout
         status === 500;           // Internal Server Error
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute HTTP request with exponential backoff retry logic
 * @param {function} requestFn - Function that returns axios request promise
 * @param {object} config - Backoff configuration
 * @returns {Promise} Promise that resolves with response or rejects after max retries
 */
async function withBackoff(requestFn, config = DEFAULT_CONFIG) {
  let lastError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Execute the request
      const response = await requestFn();
      return response;
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt, throw the error
      if (attempt === config.maxRetries) {
        throw error;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, config);
      
      // Log retry attempt (in production, use proper logging)
      console.log(`API request failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`, 
                  error.response?.status || error.message);
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Create a Spotify API request function with authorization header
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {object} options - Additional axios options
 * @param {string} accessToken - Spotify access token
 * @returns {function} Request function for use with withBackoff
 */
function createSpotifyRequest(method, url, options = {}, accessToken) {
  return () => {
    const config = {
      method,
      url,
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
      }
    };
    
    return axios(config);
  };
}

module.exports = {
  withBackoff,
  createSpotifyRequest,
  DEFAULT_CONFIG,
  calculateDelay,
  isRetryableError
};