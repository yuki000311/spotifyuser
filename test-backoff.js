/**
 * Simple test for the backoff functionality
 * This test verifies the backoff logic without making actual API calls
 */

const { withBackoff, calculateDelay, isRetryableError, DEFAULT_CONFIG } = require('./backoff');

// Test calculateDelay function
console.log('Testing calculateDelay function:');
for (let attempt = 0; attempt < 4; attempt++) {
  const delay = calculateDelay(attempt);
  console.log(`Attempt ${attempt}: ${delay}ms delay`);
}

// Test isRetryableError function
console.log('\nTesting isRetryableError function:');
const testCases = [
  { status: 429, expected: true, name: 'Rate limiting' },
  { status: 503, expected: true, name: 'Service unavailable' },
  { status: 500, expected: true, name: 'Internal server error' },
  { status: 401, expected: false, name: 'Unauthorized' },
  { status: 404, expected: false, name: 'Not found' },
  { response: null, expected: true, name: 'Network error' }
];

testCases.forEach(testCase => {
  const error = testCase.response === null 
    ? new Error('Network error') 
    : { response: { status: testCase.status } };
  const result = isRetryableError(error);
  console.log(`${testCase.name} (${testCase.status || 'no response'}): ${result} (expected: ${testCase.expected})`);
});

// Test withBackoff with mock function
console.log('\nTesting withBackoff with mock functions:');

// Mock function that succeeds immediately
async function testSuccessImmediate() {
  console.log('Testing immediate success...');
  let callCount = 0;
  const mockFn = () => {
    callCount++;
    return Promise.resolve({ data: 'success' });
  };
  
  try {
    const result = await withBackoff(mockFn, { ...DEFAULT_CONFIG, maxRetries: 2 });
    console.log(`✓ Success: ${result.data} (called ${callCount} times)`);
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
  }
}

// Mock function that fails then succeeds
async function testRetrySuccess() {
  console.log('\nTesting retry then success...');
  let callCount = 0;
  const mockFn = () => {
    callCount++;
    if (callCount < 2) {
      const error = new Error('Rate limit');
      error.response = { status: 429 };
      throw error;
    }
    return Promise.resolve({ data: 'success after retry' });
  };
  
  try {
    const result = await withBackoff(mockFn, { ...DEFAULT_CONFIG, maxRetries: 2, baseDelay: 100 });
    console.log(`✓ Success: ${result.data} (called ${callCount} times)`);
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
  }
}

// Mock function that always fails with non-retryable error
async function testNonRetryableError() {
  console.log('\nTesting non-retryable error...');
  let callCount = 0;
  const mockFn = () => {
    callCount++;
    const error = new Error('Unauthorized');
    error.response = { status: 401 };
    throw error;
  };
  
  try {
    const result = await withBackoff(mockFn, { ...DEFAULT_CONFIG, maxRetries: 2 });
    console.log(`✓ Success: ${result.data} (called ${callCount} times)`);
  } catch (error) {
    console.log(`✓ Expected failure: ${error.message} (called ${callCount} times)`);
  }
}

// Run all tests
async function runTests() {
  await testSuccessImmediate();
  await testRetrySuccess();
  await testNonRetryableError();
  console.log('\nAll backoff tests completed!');
}

runTests().catch(console.error);