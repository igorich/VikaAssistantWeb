import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

interface StopRecordingDeps {
  setError: Dispatch<SetStateAction<string>>;
  recorderRef: MutableRefObject<MediaRecorder | null>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
}

export class StopRecording {
  private readonly deps: StopRecordingDeps;

  constructor(deps: StopRecordingDeps) {
    this.deps = deps;
  }

  stop(isRecording: boolean): void {
    const { setError, recorderRef, setIsRecording } = this.deps;
    setError('');
    if (!isRecording) return;
    try {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось остановить запись.';
      setError(message);
      setIsRecording(false);
    }
  }
}

