import { jest } from '@jest/globals'
import MetricsService from '../metrics.js'

describe('The metrics service should', () => {
  let mockAppInsights
  let metricsService
  let config
  let metric
  let expectedErrorFromFunction
  let expectedMetric
  let expectedMetricWithError
  let testFunction
  let testFunctionError
  let testPromiseFunction
  let testPromiseFunctionError

  beforeEach(async () => {
    mockAppInsights = jest.createMockFromModule('applicationInsights')

    metricsService = new MetricsService()

    config = {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      disableAppInsights: true
    }

    metric = {
      name: 'testMetric'
    }

    expectedErrorFromFunction = 'An error from executed function'

    expectedMetric = (duration) => {
      return {
        name: metric.name,
        value: duration,
        properties: {
          didError: false
        }
      }
    }

    expectedMetricWithError = (duration) => {
      const metric = expectedMetric(duration)
      metric.properties.didError = true
      metric.properties.errorMessage = expectedErrorFromFunction

      return metric
    }

    testFunction = jest.fn(() => {
      return 'A value'
    })

    testFunctionError = jest.fn(() => {
      throw expectedErrorFromFunction
    })

    testPromiseFunction = jest.fn(() => {
      return new Promise((resolve) => {
        resolve('A value')
      })
    })

    testPromiseFunctionError = jest.fn(() => {
      return new Promise((resolve, reject) => {
        reject(expectedErrorFromFunction)
      })
    })
  })

  afterEach(() => {
    if (metricsService.telemetryClient) {
      metricsService.flushClient()
    }
  })

  afterAll(async () => {
    // workaround to give application insights the time to close all handles
    // and stop jest raising warning because of open handles
    // https://github.com/microsoft/ApplicationInsights-node.js/issues/935
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('execute a given function and return a duration', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)

    metricsService.telemetryClient = mockClient

    const { result, duration } = metricsService.execute(testFunction, metric, config)

    expect(metricsService.telemetryClient).toBe(mockClient)
    expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetric(duration))

    expect(testFunction).toHaveBeenCalledTimes(1)

    expect(typeof duration).toBe('number')
    expect(duration).toBeGreaterThan(0)
    expect(result).toBe('A value')
  })

  it('execute a given function and return a duration when function raises an error', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)

    metricsService.telemetryClient = mockClient

    const funcToTest = () => metricsService.execute(testFunctionError, metric, config)

    expect(funcToTest).toThrow(expectedErrorFromFunction)

    expect(metricsService.telemetryClient).toBe(mockClient)
    const duration = mockClient.trackMetric.mock.calls[0][0].value // call #1, argument #1
    expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetricWithError(duration))

    expect(testFunctionError).toHaveBeenCalledTimes(1)

    expect(typeof duration).toBe('number')
    expect(duration).toBeGreaterThan(0)
  })

  it('execute a given async function and return a duration', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)

    metricsService.telemetryClient = mockClient

    metricsService.executeAsync(testPromiseFunction, metric, config)
      .then(({ result, duration }) => {
        expect(metricsService.telemetryClient).toBe(mockClient)
        expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetric(duration))

        expect(testPromiseFunction).toHaveBeenCalledTimes(1)

        expect(typeof duration).toBe('number')
        expect(duration).toBeGreaterThan(0)
        expect(result).toBe('A value')
      })
  })

  it('execute a given async function and return a duration when function raises an error', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)

    metricsService.telemetryClient = mockClient

    try {
      await metricsService.executeAsync(testPromiseFunctionError, metric, config)
    } catch (error) {
      expect(error).toBe(expectedErrorFromFunction)
    }

    expect(metricsService.telemetryClient).toBe(mockClient)
    const duration = mockClient.trackMetric.mock.calls[0][0].value // call #1, argument #1
    expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetricWithError(duration))

    expect(testPromiseFunctionError).toHaveBeenCalledTimes(1)

    expect(typeof duration).toBe('number')
    expect(duration).toBeGreaterThan(0)
  })

  it('execute all given async functions and return durations for each', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)
    const functionsToExecute = [testPromiseFunction, testPromiseFunction]

    metricsService.telemetryClient = mockClient

    metricsService.executeAllAsync(functionsToExecute, metric, config)
      .then(({ results, durations }) => {
        expect(metricsService.telemetryClient).toBe(mockClient)

        expect(testPromiseFunction).toHaveBeenCalledTimes(2)

        functionsToExecute.forEach((_, i) => {
          expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetric(durations[i]))

          expect(typeof durations[i]).toBe('number')
          expect(durations[i]).toBeGreaterThan(0)
          expect(results[i]).toBe('A value')
        })
      })
  })

  it('execute all given async functions failing fast and return durations for each', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)
    const functionsToExecute = [testPromiseFunction, testPromiseFunction]

    metricsService.telemetryClient = mockClient

    metricsService.executeAllFailFastAsync(functionsToExecute, metric, config)
      .then(({ results, durations }) => {
        expect(metricsService.telemetryClient).toBe(mockClient)

        expect(testPromiseFunction).toHaveBeenCalledTimes(2)

        functionsToExecute.forEach((_, i) => {
          expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetric(durations[i]))

          expect(typeof durations[i]).toBe('number')
          expect(durations[i]).toBeGreaterThan(0)
          expect(results[i]).toBe('A value')
        })
      })
  })

  it('execute all given async functions and return durations for each when any returns an error', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)
    const functionsToExecute = [testPromiseFunctionError, testPromiseFunction, testPromiseFunctionError]

    metricsService.telemetryClient = mockClient

    metricsService.executeAllAsync(functionsToExecute, metric, config)
      .then(({ results, durations, errors }) => {
        expect(metricsService.telemetryClient).toBe(mockClient)

        expect(testPromiseFunction).toHaveBeenCalledTimes(1)
        expect(testPromiseFunctionError).toHaveBeenCalledTimes(2)

        functionsToExecute.forEach((_, i) => {
          const durationResult = durations[i]
          const internalDuration = mockClient.trackMetric.mock.calls[i][0].value
          const error = errors[i]

          if (i % 2 !== 0) { // success function
            expect(typeof durationResult).toBe('number')
            expect(durationResult).toBeGreaterThan(0)
            expect(durationResult).toBe(internalDuration)
            expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetric(internalDuration))
            expect(error).toBeUndefined()
            expect(results[i]).toBe('A value')
          } else { // error function
            expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetricWithError(internalDuration))
            expect(error).toBe(expectedErrorFromFunction)
            expect(durationResult).toBeUndefined()
            expect(results[i]).toBeUndefined()
          }
        })
      })
  })

  it('execute all given async functions failing fast and return durations for each when any returns an error', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)
    const functionsToExecute = [testPromiseFunction, testPromiseFunctionError, testPromiseFunction, testPromiseFunctionError]

    metricsService.telemetryClient = mockClient

    try {
      await metricsService.executeAllFailFastAsync(functionsToExecute, metric, config)
    } catch (error) {
      expect(error).toBe(expectedErrorFromFunction)
    }

    expect(metricsService.telemetryClient).toBe(mockClient)

    expect(testPromiseFunctionError).toHaveBeenCalledTimes(2)
    expect(testPromiseFunction).toHaveBeenCalledTimes(2)

    functionsToExecute.forEach((_, i) => {
      const internalDuration = mockClient.trackMetric.mock.calls[i][0].value // call #i, argument #1

      expect(typeof internalDuration).toBe('number')
      expect(internalDuration).toBeGreaterThan(0)

      if (i % 2 === 0) { // success function
        expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetric(internalDuration))
      } else { // error function
        expect(mockClient.trackMetric).toHaveBeenCalledWith(expectedMetricWithError(internalDuration))
      }
    })
  })

  it('should create telemetry client from the environment variable connection string', async () => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=647154e0-5f23-4329-b6aa-96108370b919;IngestionEndpoint=https://uksouth-1.in.applicationinsights.azure.com/;LiveEndpoint=https://uksouth.livediagnostics.monitor.azure.com/'
    metricsService.telemetryClient = undefined

    metricsService.execute(() => testFunction(), metric, null)

    expect(metricsService.telemetryClient).toBeDefined()
    expect(testFunction).toHaveBeenCalledTimes(1)
  })

  it('should create telemetry client from the config connection string', async () => {
    const telemetryClientConfig = {
      connectionString: 'InstrumentationKey=647154e0-5f23-4329-b6aa-96108370b919;IngestionEndpoint=https://uksouth-1.in.applicationinsights.azure.com/;LiveEndpoint=https://uksouth.livediagnostics.monitor.azure.com/',
      samplingPercentage: 100
    }

    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = undefined
    metricsService.telemetryClient = undefined

    metricsService.execute(() => testFunction(), metric, telemetryClientConfig)

    expect(metricsService.telemetryClient).toBeDefined()
    expect(metricsService.telemetryClient.config.samplingPercentage).toBe(telemetryClientConfig.samplingPercentage)
    expect(testFunction).toHaveBeenCalledTimes(1)
  })

  it('should raise error when telemetry client not provided and could not be created', async () => {
    metricsService.telemetryClient = undefined
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = undefined

    try {
      metricsService.execute(() => testFunction(), metric, null)
    } catch (error) {
      expect(error.message).toBe('No connection string found to create a new telemetry client.')
    }

    expect(metricsService.telemetryClient).toBeUndefined()
    expect(testFunction).not.toHaveBeenCalled()
  })

  it('should flush metric client', async () => {
    const mockClient = new mockAppInsights.TelemetryClient(config.connectionString)
    metricsService.telemetryClient = mockClient

    metricsService.flushClient()

    expect(mockClient.flush).toHaveBeenCalled()
  })
})
