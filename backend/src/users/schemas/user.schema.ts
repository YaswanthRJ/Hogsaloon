import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    unique: true,
    trim: true,
  })
  username: string;

  @Prop({ required: true })
  hashedPassword: string;

  @Prop({
    default: null,
    trim: true,
  })
  imageUrl: string;

  @Prop({
    type: [String],
    default: [],
  })
  interests: string[];

  @Prop({
    type: [String],
    default: [],
  })
  languages: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);