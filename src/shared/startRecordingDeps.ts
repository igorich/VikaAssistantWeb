import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

export interface StartRecordingDeps {
  setError: Dispatch<SetStateAction<string>>;
  setLastFileName: Dispatch<SetStateAction<string>>;
  setTranscript: Dispatch<SetStateAction<string>>;
  streamRef: MutableRefObject<MediaStream | null>;
  recorderRef: MutableRefObject<MediaRecorder | null>;
  chunksRef: MutableRefObject<Blob[]>;
  setIsTranscribing: Dispatch<SetStateAction<boolean>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
}