import { StudyLensAPI } from '../shared/ipc';

declare global {
  interface Window {
    api: StudyLensAPI;
  }
}
