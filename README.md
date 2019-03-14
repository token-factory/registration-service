# Token Factory Registration Service
Tenant and user registration

## Background
Token Factory Registration Service is the first attempt to build a GraphQL Server backend using Apollo specifically for the Token Factory Login Service.   (https://www.apollographql.com/server).    The application is a simple user registry application. The application supports creation of tenants, users, login and also an API to find out details about the currently authenticated user.

## Prerequisites
Token Factory does have a dependency on MongoDB (https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/) for local testing and dev.   For automated builds in Travis, the .travis.yml leverages the built in mongodb service.  For Kubernetes deployments to IBM Cloud we deploy a mongodb helm chart.
```
*Start MongoDB*
./bin/mongod -dbpath deleteme/
```

### Start server
To run this program, NPM install the various dependencies and start the server.  The server requires a JWT (JSON Web Token) secret to start so just randomly generate one for testing.  

```
npm install; npm run build; npm run start:development
```

### Testing
```
npm install; make build-app
npm run test
```

## NPM Commands

The full list of npm scripts are described below.

| Command                     | Description                |
| --------------------------- | -------------------------- |
| `npm test`                  | Runs jest tests            |
| `npm start:production`      | Starts production server   |
| `npm run start:test`        | Starts test server   |
| `npm run start:development` | Starts development server  |
| `npm run start:development-bg` | Starts development server in background for generating GraphQL Docs  |
| `npm run stop:development-bg` | Stops development server for generating GraphQL Docs  |
| `npm run start`             | Starts development server  |
| `npm run lint`              | Runs lint code style check |
| `npm run build`             | Perform clean and babel build        |
| `npm run build-server`      | Babel build                |
| `npm run build:production`  | Calls npm run build       |
| `npm run clean`             | Clean all old builds       |


###  API Docs
| API  | Link |
| ------------- | ------------- |
| GraphQL Queries  | https://pages.github.ibm.com/BlockchainInnovation/token-factory-registration-service/query.doc.html  |
| GraphQL Mutations | https://pages.github.ibm.com/BlockchainInnovation/token-factory-registration-service/mutation.doc.html  |
