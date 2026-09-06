import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type UserDocument = User & Document;

@Schema({timestamps: true})
export class User{
    @Prop({required: true, unique: true, lowescase: true, trim: true})
    email: string;

    @Prop({required: true, unique: true, trim: true})
    username: string;

    @Prop({required: true})
    hashedPassword: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });