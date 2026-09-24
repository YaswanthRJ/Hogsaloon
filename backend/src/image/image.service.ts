import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadedImage {
	publicId: string;
	secureUrl: string;
}

@Injectable()
export class ImageService {
	private readonly cloudinary: typeof cloudinary;

	constructor(config: ConfigService) {
		this.cloudinary = cloudinary;
		this.cloudinary.config(config.getOrThrow<string>('CLOUDINARY_URL'));
		this.cloudinary.config({
			secure: true,
		});
	}

	async uploadImage(
		filePath: string,
		publicId: string,
	): Promise<UploadedImage> {
		const response = await this.cloudinary.uploader.upload(filePath, {
			public_id: publicId,
			unique_filename: false,
			overwrite: true,
		});

		return this.toUploadedImage(response);
	}

	async uploadImageBytes(
		data: Uint8Array,
		publicId: string,
	): Promise<UploadedImage> {
		const response = await new Promise<UploadApiResponse>((resolve, reject) => {
			const uploadStream = this.cloudinary.uploader.upload_stream(
				{
					public_id: publicId,
					unique_filename: false,
					overwrite: true,
				},
				(error, result) => {
					if (error) {
						reject(error);
					} else if (result) {
						resolve(result);
					} else {
						reject(new Error('Cloudinary upload returned no result'));
					}
				},
			);

			uploadStream.end(data);
		});

		return this.toUploadedImage(response);
	}

	async deleteImage(publicId: string): Promise<void> {
		await this.cloudinary.uploader.destroy(publicId);
	}

	private toUploadedImage(response: UploadApiResponse): UploadedImage {
		return {
			publicId: response.public_id,
			secureUrl: response.secure_url,
		};
	}
}
