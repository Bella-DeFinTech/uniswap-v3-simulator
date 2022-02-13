### Configuration

When Tuner is run, it searches for the closest tuner.config.js file starting from the Current Working Directory. This file normally lives in the root of your project. The `RPCProviderUrl` need to be specified, and it's recommended to setup an environment variable:

```javascript
module.exports = {
  RPCProviderUrl: process.env.MAINNET_PROVIDER_URL,
};
```
