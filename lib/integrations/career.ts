import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

let pdfExtract: { extractText: (uri: string) => Promise<string>; isAvailable: () => boolean } | null = null;
try {
  pdfExtract = require('expo-pdf-text-extract');
} catch {
  pdfExtract = null;
}

export type CareerPayload = { method: 'text' | 'resume' | 'linkedin'; content: string };

/**
 * Pick and parse a resume file (PDF or TXT). Returns normalized career payload.
 */
export async function uploadResume(): Promise<CareerPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/plain', 'text/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const uri = asset.uri;
  const mimeType = asset.mimeType || '';

  if (mimeType === 'application/pdf' || uri?.toLowerCase().endsWith('.pdf')) {
    if (pdfExtract?.isAvailable?.()) {
      try {
        const text = await pdfExtract.extractText(uri);
        return { method: 'resume', content: text?.trim() || '' };
      } catch (e) {
        console.warn('PDF extraction failed:', e);
        return null;
      }
    }
    return null;
  }

  try {
    const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    return { method: 'resume', content: text?.trim() || '' };
  } catch (e) {
    console.warn('File read failed:', e);
    return null;
  }
}

/**
 * LinkedIn OAuth is handled in the career screen via useAuthRequest (React hook).
 * This flag indicates whether LinkedIn is configured for the app.
 */

export function isResumeUploadAvailable(): boolean {
  return true;
}

export function isLinkedInAvailable(): boolean {
  return !!process.env.EXPO_PUBLIC_LINKEDIN_CLIENT_ID;
}
