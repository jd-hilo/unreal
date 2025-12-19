import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

export interface Memoji {
  id: string;
  url: string;
  created_at: string;
}

/**
 * Upload a memoji image to Supabase storage
 */
export async function uploadMemoji(userId: string, imageUri: string): Promise<string> {
  try {
    // Get file extension
    const fileExtension = imageUri.split('.').pop() || 'png';
    const fileName = `${userId}/${Date.now()}.${fileExtension}`;
    const filePath = `memojis/${fileName}`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array for Supabase
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('memojis')
      .upload(filePath, byteArray, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('memojis')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading memoji:', error);
    throw error;
  }
}

/**
 * Delete a memoji from Supabase storage
 */
export async function deleteMemoji(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/memojis/');
    if (urlParts.length < 2) {
      throw new Error('Invalid memoji URL');
    }
    const filePath = `memojis/${urlParts[1]}`;

    const { error } = await supabase.storage
      .from('memojis')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting memoji:', error);
    throw error;
  }
}

/**
 * Get all memojis for a user from the database
 */
export async function getUserMemojis(userId: string): Promise<Memoji[]> {
  const { data, error } = await supabase
    .from('user_memojis')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Save a memoji URL to the database
 */
export async function saveMemojiToDatabase(userId: string, imageUrl: string): Promise<Memoji> {
  const { data, error } = await supabase
    .from('user_memojis')
    .insert({
      user_id: userId,
      url: imageUrl,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a memoji from the database
 */
export async function deleteMemojiFromDatabase(memojiId: string): Promise<void> {
  const { error } = await supabase
    .from('user_memojis')
    .delete()
    .eq('id', memojiId);

  if (error) throw error;
}

/**
 * Set the selected memoji for a user
 */
export async function setSelectedMemoji(userId: string, memojiUrl: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ selected_memoji_url: memojiUrl } as any)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Get the selected memoji URL for a user
 */
export async function getSelectedMemoji(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('selected_memoji_url')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data?.selected_memoji_url || null;
}

