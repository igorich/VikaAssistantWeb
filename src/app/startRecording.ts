import { IssuesResponse } from "../shared/issueResponse";
import { StartRecordingDeps } from "../shared/startRecordingDeps";
import { OpenAiService } from "./openAiService";

export class StartRecording {
  private readonly deps: StartRecordingDeps;
  private readonly mimeType: string;
  private aiSvc: OpenAiService;
  public transcript: string;

  constructor(deps: StartRecordingDeps, apiKey: string, ) {
    this.deps = deps;
    this.mimeType = this.detectMimeType();
    this.transcript = '';
    this.aiSvc = new OpenAiService(this.deps, apiKey);
  }

  private detectMimeType(): string {
    const preferred = 'audio/webm;codecs=opus';
    if (window.MediaRecorder && typeof window.MediaRecorder.isTypeSupported === 'function') {
      if (window.MediaRecorder.isTypeSupported(preferred))
        return preferred;
      if (window.MediaRecorder.isTypeSupported('audio/webm'))
        return 'audio/webm';
      if (window.MediaRecorder.isTypeSupported('audio/ogg;codecs=opus'))
        return 'audio/ogg;codecs=opus';
    }
    return '';
  }

  async start(isRecording: boolean): Promise<void> {
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
    if (isRecording)
       return;

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

      recorder.onstop = async () => {
        const type = recorder.mimeType || this.mimeType || 'audio/webm';
        this.transcript = await this.aiSvc.runTranscript(type) ?? '';
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

  runTranscript(mimeType: string): Promise<string | null> {
    return this.aiSvc.runTranscript(mimeType);
  }

  runTasksDetection(projectsData: IssuesResponse[] , speech: string): Promise<string | null> {
    return this.aiSvc.runTasksDetection(projectsData, speech);
  }
}

