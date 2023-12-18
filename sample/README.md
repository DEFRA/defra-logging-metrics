# Sample for defra-logging-metrics package use

Assuming you first have NodeJS installed locally:

1. Create a local `.env` file. This file won't be tracked by git.
1. Define an environment variable `APPLICATIONINSIGHTS_CONNECTION_STRING` in the `.env` file and initialize it with your Azure Application Insights connection string.
1. Open a terminal at the root folder of this repository.
1. Run `npm install`
1. Run `cd sample`
1. Run `npm start` (or `node sample.js`)