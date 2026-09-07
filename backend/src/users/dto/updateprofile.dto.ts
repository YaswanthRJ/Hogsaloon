import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];
}