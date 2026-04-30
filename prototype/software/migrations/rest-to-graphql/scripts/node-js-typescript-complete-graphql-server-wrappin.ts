// Input:  Existing REST API at https://api.example.com/v1/
// Output: GraphQL server that proxies and reshapes REST responses

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { RESTDataSource } from '@apollo/datasource-rest';
import DataLoader from 'dataloader';

// Data source wrapping existing REST API
class ProductsAPI extends RESTDataSource {
  override baseURL = 'https://api.example.com/v1/';

  async getProducts(category?: string): Promise<Product[]> {
    const params = category ? { category } : {};
    return this.get('products', { params });
  }

  async getProduct(id: string): Promise<Product> {
    return this.get(`products/${encodeURIComponent(id)}`);
  }

  async getReviewsByProductIds(ids: string[]): Promise<Review[][]> {
    // Batch endpoint — if your REST API supports it
    const reviews = await this.get('reviews', {
      params: { productIds: ids.join(',') },
    });
    return ids.map(id => reviews.filter((r: Review) => r.productId === id));
  }
}

// Schema definition
const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    price: Float!
    category: String!
    reviews: [Review!]!
    averageRating: Float
  }

  type Review {
    id: ID!
    rating: Int!
    comment: String
    author: String!
  }

  type Query {
    products(category: String): [Product!]!
    product(id: ID!): Product
  }

  type Mutation {
    addReview(productId: ID!, rating: Int!, comment: String, author: String!): Review!
  }
`;

// Resolvers with DataLoader for N+1 prevention
const resolvers = {
  Query: {
    products: (_: unknown, args: { category?: string }, { dataSources }: Context) =>
      dataSources.productsAPI.getProducts(args.category),
    product: (_: unknown, { id }: { id: string }, { dataSources }: Context) =>
      dataSources.productsAPI.getProduct(id),
  },
  Product: {
    reviews: (parent: Product, _: unknown, { loaders }: Context) =>
      loaders.reviews.load(parent.id),
    averageRating: async (parent: Product, _: unknown, { loaders }: Context) => {
      const reviews = await loaders.reviews.load(parent.id);
      if (reviews.length === 0) return null;
      return reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length;
    },
  },
  Mutation: {
    addReview: (_: unknown, args: any, { dataSources }: Context) =>
      dataSources.productsAPI.post('reviews', { body: args }),
  },
};

// Server setup
const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  context: async () => {
    const productsAPI = new ProductsAPI();
    return {
      dataSources: { productsAPI },
      loaders: {
        reviews: new DataLoader((ids: readonly string[]) =>
          productsAPI.getReviewsByProductIds([...ids])
        ),
      },
    };
  },
});

console.log(`GraphQL server ready at ${url}`);
