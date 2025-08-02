// Simple integration tests that focus on testable functionality
describe('Safe Settings Integration Tests', () => {
  describe('File Structure', () => {
    test('should have all required files', () => {
      const fs = require('fs');
      
      expect(fs.existsSync('safe-settings-handler.js')).toBe(true);
      expect(fs.existsSync('index.js')).toBe(true);
      expect(fs.existsSync('package.json')).toBe(true);
      expect(fs.existsSync('Dockerfile')).toBe(true);
    });
    
    test('should have valid package.json', () => {
      const packageJson = require('../package.json');
      
      expect(packageJson.name).toBe('safe-settings-lambda');
      expect(packageJson.scripts.test).toBe('jest');
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.devDependencies).toBeDefined();
    });
  });

  describe('Module Loading', () => {
    test('should load handler module without errors', () => {
      expect(() => require('../safe-settings-handler')).not.toThrow();
    });

    test('should export required handler functions', () => {
      const handler = require('../safe-settings-handler');
      
      expect(typeof handler.webhooks).toBe('function');
      expect(typeof handler.scheduler).toBe('function');
    });
  });

  describe('Mock App Function', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      // Clear require cache to pick up new env
      delete require.cache[require.resolve('../index.js')];
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should export a function that returns an object with syncInstallation', () => {
      const appFn = require('../index.js');
      
      expect(typeof appFn).toBe('function');
      
      const app = appFn({}, {});
      expect(app).toBeDefined();
      expect(typeof app.syncInstallation).toBe('function');
    });

    test('should handle syncInstallation calls in development', async () => {
      const appFn = require('../index.js');
      const app = appFn({}, {});
      
      const result = await app.syncInstallation();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.environment).toBe('development');
      expect(result.timestamp).toBeDefined();
    });

    test('should throw error in production mode when Safe Settings not found', async () => {
      process.env.NODE_ENV = 'production';
      delete require.cache[require.resolve('../index.js')];
      
      const appFn = require('../index.js');
      const app = appFn({}, {});
      
      await expect(app.syncInstallation()).rejects.toThrow('Production Safe Settings implementation not found');
    });
  });
}); 