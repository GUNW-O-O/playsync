import { IsString, MinLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MinLength(2)
  storeName: string;

  ownerId: string;
}

export class updateStoreDto {
  @IsString()
  @MinLength(2)
  storeName : string;
  
  ownerId : string;
}