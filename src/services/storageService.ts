import { supabaseClient, PROFILE_PICTURES_BUCKET } from '../config/supabase';
import { DatabaseResponse } from '../types';
import crypto from 'crypto';

/**
 * Storage Service
 * Handles file uploads to Supabase Storage
 */

export interface UploadResult {
    publicUrl: string;
    path: string;
    size: number;
}

/**
 * Upload profile picture to Supabase Storage
 * 
 * @param userId - User ID for organizing files
 * @param file - File buffer
 * @param originalName - Original filename
 * @param mimetype - File MIME type
 * @returns Public URL of uploaded file
 */
export const uploadProfilePicture = async (
    userId: string,
    file: Buffer,
    originalName: string,
    mimetype: string
): Promise<DatabaseResponse<UploadResult>> => {
    try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(mimetype)) {
            return {
                data: null,
                error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
                success: false
            };
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.length > maxSize) {
            return {
                data: null,
                error: 'File size exceeds 5MB limit.',
                success: false
            };
        }

        // Generate unique filename
        const fileExt = originalName.split('.').pop() || 'jpg';
        const randomHash = crypto.randomBytes(16).toString('hex');
        const filename = `${userId}/${Date.now()}-${randomHash}.${fileExt}`;

        // Delete old profile pictures for this user (optional - keeps storage clean)
        const { data: existingFiles } = await supabaseClient.storage
            .from(PROFILE_PICTURES_BUCKET)
            .list(userId);

        if (existingFiles && existingFiles.length > 0) {
            const filesToDelete = existingFiles.map(file => `${userId}/${file.name}`);
            await supabaseClient.storage
                .from(PROFILE_PICTURES_BUCKET)
                .remove(filesToDelete);
        }

        // Upload new file
        const { data, error } = await supabaseClient.storage
            .from(PROFILE_PICTURES_BUCKET)
            .upload(filename, file, {
                contentType: mimetype,
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Supabase upload error:', error);

            // Check if bucket doesn't exist
            if (error.message.includes('Bucket not found')) {
                return {
                    data: null,
                    error: `Storage bucket '${PROFILE_PICTURES_BUCKET}' not found. Please create it in Supabase Dashboard → Storage → Create Bucket → Name: '${PROFILE_PICTURES_BUCKET}' (make it Public)`,
                    success: false
                };
            }

            return {
                data: null,
                error: `Failed to upload file: ${error.message}`,
                success: false
            };
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from(PROFILE_PICTURES_BUCKET)
            .getPublicUrl(data.path);

        return {
            data: {
                publicUrl,
                path: data.path,
                size: file.length
            },
            error: null,
            success: true
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred during upload',
            success: false
        };
    }
};

/**
 * Delete profile picture from Supabase Storage
 * 
 * @param path - File path in storage
 * @returns Success boolean
 */
export const deleteProfilePicture = async (
    path: string
): Promise<DatabaseResponse<boolean>> => {
    try {
        const { error } = await supabaseClient.storage
            .from(PROFILE_PICTURES_BUCKET)
            .remove([path]);

        if (error) {
            console.error('Supabase delete error:', error);
            return {
                data: null,
                error: `Failed to delete file: ${error.message}`,
                success: false
            };
        }

        return {
            data: true,
            error: null,
            success: true
        };
    } catch (error) {
        console.error('Delete error:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred during deletion',
            success: false
        };
    }
};

/**
 * Delete all profile pictures for a user
 * 
 * @param userId - User ID
 * @returns Number of files deleted
 */
export const deleteUserProfilePictures = async (
    userId: string
): Promise<DatabaseResponse<number>> => {
    try {
        const { data: files } = await supabaseClient.storage
            .from(PROFILE_PICTURES_BUCKET)
            .list(userId);

        if (!files || files.length === 0) {
            return {
                data: 0,
                error: null,
                success: true
            };
        }

        const filePaths = files.map(file => `${userId}/${file.name}`);
        const { error } = await supabaseClient.storage
            .from(PROFILE_PICTURES_BUCKET)
            .remove(filePaths);

        if (error) {
            console.error('Supabase delete error:', error);
            return {
                data: null,
                error: `Failed to delete files: ${error.message}`,
                success: false
            };
        }

        return {
            data: filePaths.length,
            error: null,
            success: true
        };
    } catch (error) {
        console.error('Delete error:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred during deletion',
            success: false
        };
    }
};

