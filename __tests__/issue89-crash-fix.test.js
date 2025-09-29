/**
 * Test to verify that the new architecture build crash issue is fixed
 * This test specifically reproduces the scenario from issue #89
 */

describe('New Architecture Build Crash Fix - Issue #89', () => {
  let consoleSpy

  beforeEach(() => {
    jest.resetModules()
    consoleSpy = {
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    }
  })

  afterEach(() => {
    consoleSpy.warn.mockRestore()
    consoleSpy.error.mockRestore()
  })

  test('should not crash when neither TurboModule nor Bridge module is available', () => {
    // Mock scenario where neither TurboModule nor Bridge module is available
    jest.doMock('react-native', () => ({
      TurboModuleRegistry: {
        getEnforcing: jest.fn().mockImplementation(() => {
          throw new Error('TurboModuleRegistry.getEnforcing(...): \'RNBackgroundDownloader\' could not be found. Verify that a module by this name is registered in the native binary.')
        }),
      },
      NativeModules: {
        // No RNBackgroundDownloader available - this simulates the exact scenario from the issue
      },
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: () => ({ remove: () => {} }),
        removeAllListeners: () => {},
        removeSubscription: () => {},
      })),
    }))

    // This should NOT throw a crash (was the original problem)
    expect(() => {
      const RNBackgroundDownloader = require('../src/index')

      // The module should load successfully
      expect(RNBackgroundDownloader).toBeDefined()
      expect(typeof RNBackgroundDownloader.download).toBe('function')
      expect(typeof RNBackgroundDownloader.checkForExistingDownloads).toBe('function')
    }).not.toThrow()

    // Should log appropriate warnings but not crash
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      '[RNBackgroundDownloader] TurboModule not available, falling back to bridge:',
      expect.any(String)
    )
    expect(consoleSpy.error).toHaveBeenCalledWith(
      '[RNBackgroundDownloader] Neither TurboModule nor Bridge module available'
    )
  })

  test('should handle checkForExistingDownloads safely when native module unavailable', async () => {
    // Mock scenario where neither TurboModule nor Bridge module is available
    jest.doMock('react-native', () => ({
      TurboModuleRegistry: {
        getEnforcing: jest.fn().mockImplementation(() => {
          throw new Error('TurboModuleRegistry.getEnforcing(...): \'RNBackgroundDownloader\' could not be found.')
        }),
      },
      NativeModules: {},
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: () => ({ remove: () => {} }),
        removeAllListeners: () => {},
        removeSubscription: () => {},
      })),
    }))

    const RNBackgroundDownloader = require('../src/index')

    // This call should not crash and should return empty array
    const result = await RNBackgroundDownloader.checkForExistingDownloads()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)

    expect(consoleSpy.warn).toHaveBeenCalledWith(
      '[RNBackgroundDownloader] Native module not available, returning empty array'
    )
  })

  test('should handle download calls safely when native module unavailable', () => {
    // Mock scenario where neither TurboModule nor Bridge module is available
    jest.doMock('react-native', () => ({
      TurboModuleRegistry: {
        getEnforcing: jest.fn().mockImplementation(() => {
          throw new Error('TurboModuleRegistry.getEnforcing(...): \'RNBackgroundDownloader\' could not be found.')
        }),
      },
      NativeModules: {},
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: () => ({ remove: () => {} }),
        removeAllListeners: () => {},
        removeSubscription: () => {},
      })),
    }))

    const RNBackgroundDownloader = require('../src/index')

    // This call should not crash
    expect(() => {
      const task = RNBackgroundDownloader.download({
        id: 'test-download',
        url: 'https://example.com/file.zip',
        destination: '/tmp/file.zip',
      })

      expect(task).toBeDefined()
      expect(task.state).toBe('FAILED') // Should be in failed state due to native module unavailable
    }).not.toThrow()

    expect(consoleSpy.error).toHaveBeenCalledWith(
      '[RNBackgroundDownloader] Native module not available for download'
    )
  })
})
