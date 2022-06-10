import { request, gql } from "graphql-request";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

describe("Test Uniswap v3 Subgraph", function () {
  const APIURL = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";

  it("can download events", async function () {
    const query = gql`
      query {
        pool(id: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8") {
          id
          mints(first: 5, orderBy: timestamp, orderDirection: asc) {
            amount0
            amount1
            amount
            logIndex
            timestamp
          }
        }
      }
    `;

    let data = await request(APIURL, query);
    console.log(data.pool.mints);
  });
});
