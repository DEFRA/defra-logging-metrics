import 'dotenv/config'
import applicationInsights from 'applicationinsights'
applicationInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start()

import MetricsService from '@defra/logging-metrics/metrics.js'

// Connection string will be sourced from APPLICATIONINSIGHTS_CONNECTION_STRING environment variable if not supplied here.
// A local .env file (not tracked by git) can be used locally to define environment variables.
let config = {
    //connectionString: "", 
    samplingPercentage: 100
}

let metric = {
    name: "defraloggingmetrics-sampleMetric",
    properties: { sampleDimension: "sampleDimensionValue" }
}

let metricsService = new MetricsService()

let myFunction = () => {
    return "A value"
}

let myFunctionWithError = () => {
    throw new Error("An error")
}

let delayedFunction = (delay) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('A value');
        }, delay);
    });    
}

// execute
let res = metricsService.execute(() => myFunction(), metric, config)
console.log(`Took ${res.duration} seconds for ${res.result}`)

// execute using default client from auto-collecting setup
res = new MetricsService(applicationInsights.defaultClient).execute(() => myFunction(), metric, config)
console.log(`Took ${res.duration} seconds for ${res.result}`)

// executeAsync
await metricsService.executeAsync(() => delayedFunction(500), metric, config)
.then(({ result, duration }) => {
    console.log(`Took ${duration} seconds for ${result}`)
})

// executeAllAsync
await metricsService.executeAllAsync([() => delayedFunction(500), () => delayedFunction(800)], metric, config)
.then(({ results, durations }) => {
    results.forEach((result, i) => {
        console.log(`Took ${durations[i]} seconds for ${result}`)
    })    
})

// execute with error
try {
    metricsService.execute(() => myFunctionWithError(), metric, config)
} catch (error) {
    console.log(`Executed function threw error: ${error.message}`)
}

metricsService.flushClient()