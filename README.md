# Defra Logging Metrics

This Defra Common Platform npm package provides a library to measure the duration of functions execution and log them into Azure Application Insights as custom metrics with optional custom dimensions.

## Run tests

```shell
npm install
```

```shell
npm test
```

## Use the package from npm

1. Install the package

   ```shell
   npm install @defra/logging-metrics --save
   ```

1. Import the module in your script

   ```js
   import MetricsService from '@defra/logging-metrics'
   ```

1. Initialize the metrics service

   ```js
   let metricsService = new MetricsService()
   ```

1. If you are already running application insights and already have a `TelemetryClient` configured in your application, you can create the metrics service and pass the telemetry client to the constructor:

   ```js
   let metricsService = new MetricsService(telemetryClient)
   ```

   Alternatively you can create a new telemetry client and provide the configuration with a connection string and any other [configuration options](https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs#advanced-configuration-options) you wish e.g.:
   
   ```js
   let telemetryClientConfig = {
      connectionString: "InstrumentationKey=myKey;IngestionEndpoint=https://applicationinsights.azure.com/;LiveEndpoint=https://livediagnostics.monitor.azure.com/",
      samplingPercentage: 100
   }

   [...]

   let { duration, result } = metricsService.execute(myFunction, metric, telemetryClientConfig)
   ```

   If you don't provide a telemetry client in the constructor and you don't provide a telemetry client configuration, a new telemetry client will be created by reading the connection string from the `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable.

 1. Name the metric you want to log with along with any other custom properties to be recorded e.g.:

    ```js
    let metric = {
       name: "timeToCallDatabase",
       properties: { source: "CosmosDB" }
    }
    ```

1. Execute your function via one of the following methods, providing the `config` and `metric` from the previous steps along with the function you want to call and measure:

   - If your function does not return any kind of `Promise`:

   ```js
   let { duration, result } = metricsService.execute(myFunction, metric, config)
   console.log(`Took ${duration} seconds for ${result}`)
   ```

   - If your function returns a `Promise`:

   ```js
   metricsService.executeAsync(asyncFunction, metric, config)
   .then(({ result, duration }) => {
      console.log(`Took ${duration} seconds for ${result}`)
   })
   ```

   - If you need to use a `Promise.all()`-like behavior and record each function call:

   ```js
   metricsService.executeAllFailFastAsync(() => [asyncFunction1, asyncFunction2], metric, config)
   .then(({ results, durations }) => {
      results.forEach((result, i) => {
         console.log(`Took ${durations[i]} seconds for ${result}`)
      })
   })
   ```

   - If you need to use a `Promise.allSettled()`-like behavior and record each function call:

   ```js
   metricsService.executeAllAsync(() => [asyncFunction1, asyncFunction2], metric, config)
   .then(({ results, durations }) => {
      results.forEach((result, i) => {
         console.log(`Took ${durations[i]} seconds for ${result}`)
      })
   })
   ```

1. As advised in Application Insights documentation:
   
   > If your application has a short lifespan, such as a CLI tool, it might be necessary to manually flush your buffered telemetry [...]   

   Flush is supported by calling `metricsService.flushClient()`

1. If you wish to further use, configure or access the Microsoft Azure Application Insights `TelemetryClient` within the metrics service, it can be accessed through the `metricsService.telemetryClient` variable

## Full example

A full example can be found [here](sample/README.md).