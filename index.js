// Safe Settings app function - Mock for development, replaced in production
// In production Docker container, this file is overwritten by the actual Safe Settings index.js

module.exports = function (app, options = {}) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (isDevelopment) {
    console.log('🧪 Using mock Safe Settings implementation for development')
  }
  
  // Return object with Safe Settings interface
  return {
    syncInstallation: async function() {
      if (isDevelopment) {
        console.log('🔄 Mock syncInstallation called')
        return { 
          success: true, 
          message: 'Mock sync completed',
          timestamp: new Date().toISOString(),
          environment: 'development'
        }
      } else {
        // In production, this would be the actual Safe Settings implementation
        // This code path should never be reached in production Docker container
        throw new Error('Production Safe Settings implementation not found - check Docker build')
      }
    }
  }
} 