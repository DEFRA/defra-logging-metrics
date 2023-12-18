import applicationInsights from 'applicationinsights'

export default class MetricsService {
    constructor(telemetryClient) {
        this.telemetryClient = telemetryClient;
    }

    execute = (functionToExecute, metric, telemetryClientConfig) => {
        this.#configureTelemetryClient(telemetryClientConfig)

        const {result, duration} = this.#measure(functionToExecute, metric)

        return { result, duration }
    }

    executeAsync = async (functionToExecute, metric, telemetryClientConfig) => {
        this.#configureTelemetryClient(telemetryClientConfig)
        
        const {result, duration} = await this.#measureAsync(functionToExecute, metric)

        return { result, duration }
    }

    executeAllAsync = async (functionsToExecute, metric, telemetryClientConfig) => {
        this.#configureTelemetryClient(telemetryClientConfig)
        
        const {results, durations, errors} = await this.#measureAllAsync(functionsToExecute, metric, false)

        return { results, durations, errors }
    }

    executeAllFailFastAsync = async (functionsToExecute, metric, telemetryClientConfig) => {
        this.#configureTelemetryClient(telemetryClientConfig)
        
        const {results, durations} = await this.#measureAllAsync(functionsToExecute, metric, true)

        return { results, durations }
    }

    flushClient = () => this.telemetryClient.flush()

    #trackMetric = (error, duration, metric) => {
        const createdMetric = this.#createMetric({ name: metric.name, value: duration, properties: metric.properties }, error)
        this.telemetryClient.trackMetric(createdMetric)
    }

    #calculateDuration = (performance, start) => (performance.now() - start) / 1000

    #measure = (functionToExecute, metric) => {
        let result
        let error
        let duration

        const start = performance.now()

        try {
            result = functionToExecute()
        } catch (err) {
            error = err

            throw error
        } finally {
            duration = this.#calculateDuration(performance, start)
            this.#trackMetric(error, duration, metric)
        }

        return { result, duration }
    }

    #measureAsync = async (functionToExecute, metric) => {
        let result
        let error
        let duration

        const start = performance.now()

        try {
            result = await functionToExecute()
        } catch (err) {
            error = err

            throw error
        } finally {
            duration = this.#calculateDuration(performance, start)
            this.#trackMetric(error, duration, metric)
        }

        return { result, duration }
    }

    #measureAllAsync = async (functionsToExecute, metric, isFailFast) => {
        const promises = []

        functionsToExecute.forEach((func) => {
            promises.push(this.#measureAsync(func, metric))
        })

        let promisesResults;
        if (isFailFast) {
            promisesResults = await Promise.all(promises)
        } else {
            promisesResults = await Promise.allSettled(promises)
        }

        const results = []
        const durations = []
        const errors = []

        promisesResults.forEach((promise) => {
            // errors are handled here only when using Promise.allSettled which does not throw
            // otherwise the first error throws from Promise.all
            if (promise.status && promise.status === "rejected" && promise.reason) {
                errors.push(promise.reason)
            } else {
                errors.push(undefined)
            }

            if (promise.value) {
                results.push(promise.value.result)
                durations.push(promise.value.duration)
            } else {
                results.push(promise.result)
                durations.push(promise.duration)
            }
        })

        return { results, durations, errors }
    }

    #createMetric = (metric, error) => {
        const metricProperties = {
            didError: false,
            ...metric.properties
        }

        if (error) {
            metricProperties.didError = true
            metricProperties.errorMessage = error.message ? error.message : error.toString()
        }

        return { name: metric.name, value: metric.value, properties: metricProperties }
    }

    #configureTelemetryClient = (telemetryClientConfig) => {
        if (this.telemetryClient) {
            return
        }

        let connectionString
        if (telemetryClientConfig && telemetryClientConfig.connectionString && telemetryClientConfig.connectionString.length > 0) {
            connectionString = telemetryClientConfig.connectionString
        } else if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING.length > 0) {
            connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
        }

        if (!connectionString) {
            throw Error("No connection string found to create a new telemetry client.")
        }

        if (!telemetryClientConfig) {
            telemetryClientConfig = {}
        }

        this.telemetryClient = new applicationInsights.TelemetryClient(connectionString)

        // Add user provided configs
        const userConfig = { ...telemetryClientConfig }
        delete userConfig.connectionString // connection string already provided and parsed in TelemetryClient ctor
        Object.assign({}, this.telemetryClient.config, { ...userConfig })
    }
}