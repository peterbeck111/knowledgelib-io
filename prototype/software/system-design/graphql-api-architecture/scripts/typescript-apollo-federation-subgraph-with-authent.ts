// products-subgraph/index.ts — Complete federated subgraph
// Input:  GraphQL queries routed from Apollo Router
// Output: Product data with field-level authorization

import { ApolloServer } from "@apollo/server";  // @apollo/server@4.11
import { buildSubgraphSchema } from "@apollo/subgraph";  // @apollo/subgraph@2.9
import { gql } from "graphql-tag";
import { createLoaders } from "./dataloaders";

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.5",
    import: ["@key", "@shareable", "@requires", "@external"])

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Float!
    internalCost: Float @auth(requires: ADMIN)
  }

  type Query {
    product(id: ID!): Product
    products(first: Int = 20, after: String): ProductConnection!
  }

  type ProductConnection {
    edges: [ProductEdge!]!
    pageInfo: PageInfo!
  }
`;

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});
// Attach DataLoader per request via context
