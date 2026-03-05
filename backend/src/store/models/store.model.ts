import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Store {
  
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  ownerId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
  
}