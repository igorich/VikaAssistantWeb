import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

interface StartRecordingDeps {
  setError: Dispatch<SetStateAction<string>>;
  setLastFileName: Dispatch<SetStateAction<string>>;
  setTranscript: Dispatch<SetStateAction<string>>;
  streamRef: MutableRefObject<MediaStream | null>;
  recorderRef: MutableRefObject<MediaRecorder | null>;
  chunksRef: MutableRefObject<Blob[]>;
  setIsTranscribing: Dispatch<SetStateAction<boolean>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
}

type TranscriptionResponse =
  | {
      text?: string;
      error?:
        | {
            message?: string;
          }
        | string;
    }
  | Record<string, unknown>;

export class StartRecording {
  private readonly deps: StartRecordingDeps;
  private readonly mimeType: string;

  constructor(deps: StartRecordingDeps) {
    this.deps = deps;
    this.mimeType = this.detectMimeType();
  }

  private detectMimeType(): string {
    const preferred = 'audio/webm;codecs=opus';
    if (window.MediaRecorder && typeof window.MediaRecorder.isTypeSupported === 'function') {
      if (window.MediaRecorder.isTypeSupported(preferred)) return preferred;
      if (window.MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
      if (window.MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus';
    }
    return '';
  }

  async start(apiKey: string, isRecording: boolean): Promise<void> {
    const {
      setError,
      setLastFileName,
      setTranscript,
      streamRef,
      recorderRef,
      chunksRef,
      setIsTranscribing,
      setIsRecording,
    } = this.deps;

    setError('');
    setLastFileName('');
    setTranscript('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Браузер не поддерживает запись с микрофона (нет getUserMedia).');
      return;
    }
    if (!window.MediaRecorder) {
      setError('Браузер не поддерживает MediaRecorder.');
      return;
    }
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, this.mimeType ? { mimeType: this.mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e: any) => {
        setError(e.error?.message || 'Ошибка записи.');
      };

      recorder.onstop = () => {
        const cleanup = () => {
          try {
            streamRef.current?.getTracks?.().forEach((t) => t.stop());
          } catch {
            // ignore
          }
          streamRef.current = null;
          recorderRef.current = null;
          setIsRecording(false);
        };

        const run = async () => {
          try {
            const trimmedKey = apiKey.trim();
            if (!trimmedKey) {
              throw new Error('Введите OpenAI API key (он хранится в localStorage этого браузера).');
            }

            const type = recorder.mimeType || this.mimeType || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type });
            chunksRef.current = [];

            const ext = type.includes('ogg') ? 'ogg' : 'webm';
            const fileName = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
            setLastFileName(fileName);

            setIsTranscribing(true);
            setTranscript('');

            const form = new FormData();
            form.append('file', new File([blob], fileName, { type }));
            form.append('model', 'gpt-4o-mini-transcribe');
            form.append('language', 'ru');

            const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${trimmedKey}`,
              },
              body: form,
            });

            const json = (await resp.json().catch(() => ({}))) as TranscriptionResponse;

            if (!resp.ok) {
              const errObj = json.error;
              const msg =
                (typeof errObj === 'object' && errObj && 'message' in errObj && errObj.message) ||
                (typeof errObj === 'string' && errObj) ||
                'Ошибка распознавания.';
              throw new Error(msg + 'Ошибка распознавания.');
            }

            setTranscript(json.text + '');
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Не удалось распознать речь.';
            setError(message);
          } finally {
            setIsTranscribing(false);
            cleanup();
          }
        };

        void run();
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить доступ к микрофону.';
      setError(message);
      try {
        streamRef.current?.getTracks?.().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      streamRef.current = null;
      recorderRef.current = null;
      setIsRecording(false);
    }
  }
}

