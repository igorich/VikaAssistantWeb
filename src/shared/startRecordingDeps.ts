import type { Dispatch, RefObject, SetStateAction } from 'react';

export interface StartRecordingDeps {
  setError: Dispatch<SetStateAction<string>>;
  setLastFileName: Dispatch<SetStateAction<string>>;
  setTranscript: Dispatch<SetStateAction<string>>;
  streamRef: RefObject<MediaStream | null>;
  recorderRef: RefObject<MediaRecorder | null>;
  chunksRef: RefObject<Blob[]>;
  setIsTranscribing: Dispatch<SetStateAction<boolean>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
}