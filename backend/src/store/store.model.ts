import { ObjectType, Field, ID } from '@nestjs/graphql';
import { AdminTournament } from './session/session.model';

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

  @Field(() => [AdminTournament], { nullable: 'items' })
  tournaments?: AdminTournament[];
  
}