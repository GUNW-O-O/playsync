import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Tournament } from './session/session.model';

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

  @Field(() => [Tournament], { nullable: 'items' })
  tournaments?: Tournament[];
  
}