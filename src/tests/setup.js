/**
 * Test setup file
 * Runs before all tests
 */

// Mock Firebase if needed
global.mockFirebase = {
  // Add Firebase mocks here if needed for testing
};

// Set test environment variables
process.env.NODE_ENV = 'test';

console.log('🧪 Test environment initialized');

