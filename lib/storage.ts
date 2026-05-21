import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Faz upload de uma imagem (base64 do expo-image-picker) para o bucket público
 * `photos`, na pasta do próprio usuário ({uid}/{folder}/...), e retorna a URL
 * pública.
 */
export async function uploadPhoto(opts: {
  base64: string;
  userId: string;
  folder: string;
  ext?: 'jpg' | 'png';
}): Promise<string> {
  const { base64, userId, folder, ext = 'jpg' } = opts;
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('photos').upload(path, decode(base64), {
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
