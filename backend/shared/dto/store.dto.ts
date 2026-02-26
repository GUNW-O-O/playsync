import { IsString, MinLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MinLength(2)
  storeName: string;

  @IsString()
  ownerId: string;
}

export class UpdateStoreDto {
  @IsString()
  @MinLength(2)
  storeName : string;
  
  @IsString()
  ownerId : string;
}
