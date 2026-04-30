// Input:  TypeScript classes with decorators
// Output: Executable schema with type safety

import { ObjectType, Field, ID, InputType, Mutation, Arg, Resolver }
  from "type-graphql";

@ObjectType()
class Product {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field({ deprecationReason: "Use priceV2 instead" })
  price!: number;

  @Field(() => Money)
  priceV2!: Money;
}

@InputType()
class CreateProductInput {
  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;
}

@Resolver(Product)
class ProductResolver {
  @Mutation(() => Product)
  async createProduct(@Arg("input") input: CreateProductInput) {
    return await ProductService.create(input);
  }
}
