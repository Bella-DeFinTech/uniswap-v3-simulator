### Performance

Environment: AWS EC2 t3.xlarge on us-east-1, RPC provider by Alchemy, Subgraph by hosted service on the Graph

Downloading 260,000+ events of WETH-USDC-3000(upper-middle transaction volume within all Uniswap v3 core pools) until #14027607 (Jan 18, 2022 approximately):

- Tuner v0.1.3 **461.6m(>7 hour)**
- Tuner v0.1.4 **51.1m(<1 hour)**

Replaying over 124,000 mainnet events: **within 16 second**
