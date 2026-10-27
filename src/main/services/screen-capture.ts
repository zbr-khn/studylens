import { desktopCapturer } from 'electron';

export class ScreenCaptureService {
  public async captureScreen(): Promise<string> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });

      if (sources.length === 0) {
        throw new Error('No screen display available for capture');
      }

      // Pick primary display source
      const primarySource = sources[0];
      const pngBuffer = primarySource.thumbnail.toPNG();
      return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    } catch (err: any) {
      console.error('Failed to capture screen:', err);
      throw new Error(`Screen capture failed: ${err.message}`);
    }
  }
}
