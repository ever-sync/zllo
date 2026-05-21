import * as ImagePicker from 'expo-image-picker';

/** Abre a galeria e retorna { uri, base64 } da imagem escolhida, ou null. */
export async function pickImage(): Promise<{ uri: string; base64: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.6,
    base64: true,
  });

  const asset = result.assets?.[0];
  if (result.canceled || !asset?.base64) return null;
  return { uri: asset.uri, base64: asset.base64 };
}
