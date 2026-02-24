import { useEffect, useRef, useState } from 'react';
import './App.css';
import { StartRecording } from './app/startRecording';
import { StopRecording } from './stopRecording';

function App() {
  const API_KEY_STORAGE = 'vika_openai_api_key';

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastFileName, setLastFileName] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(API_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecordingServiceRef = useRef<StartRecording | null>(null);
  const stopRecordingServiceRef = useRef<StopRecording | null>(null);

  if (!startRecordingServiceRef.current) {
    startRecordingServiceRef.current = new StartRecording({
      setError,
      setLastFileName,
      setTranscript,
      streamRef,
      recorderRef,
      chunksRef,
      setIsTranscribing,
      setIsRecording,
    });
  }

  if (!stopRecordingServiceRef.current) {
    stopRecordingServiceRef.current = new StopRecording({
      setError,
      recorderRef,
      setIsRecording,
    });
  }

  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      try {
        streamRef.current?.getTracks?.().forEach((t) => t.stop());
      } catch {
        // ignore
      }
    };
  }, []);

  const startRecording = () => {
    if (!startRecordingServiceRef.current) return;
    void startRecordingServiceRef.current.start(apiKey, isRecording);
  };

  const stopRecording = () => {
    if (!stopRecordingServiceRef.current) return;
    stopRecordingServiceRef.current.stop(isRecording);
  };

  const saveApiKey = () => {
    setError('');
    try {
      localStorage.setItem(API_KEY_STORAGE, apiKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить ключ в localStorage.';
      setError(message);
    }
  };

  const clearApiKey = () => {
    setError('');
    try {
      localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      // ignore
    }
    setApiKey('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="Main">
          <h1 className="Main-title">Vika Assistant</h1>

          <div className="Main-key">
            <div className="Main-keyRow">
              <input
                className="Main-keyInput"
                type={showApiKey ? 'text' : 'password'}
                placeholder="OpenAI API key (сохранится в localStorage)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="Main-btn Main-btnSmall"
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
              >
                {showApiKey ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            <div className="Main-keyRow">
              <button className="Main-btn Main-btnSecondary Main-btnSmall" type="button" onClick={saveApiKey}>
                Сохранить ключ
              </button>
              <button className="Main-btn Main-btnSecondary Main-btnSmall" type="button" onClick={clearApiKey}>
                Очистить
              </button>
            </div>
            <div className="Main-keyHint">
              Ключ хранится только в вашем браузере (localStorage) и отправляется напрямую в OpenAI.
            </div>
          </div>

          <div className="Main-controls">
            <button className="Main-btn" onClick={startRecording} disabled={isRecording}>
              Старт
            </button>
            <button
              className="Main-btn Main-btnSecondary"
              onClick={stopRecording}
              disabled={!isRecording || isTranscribing}
            >
              Готово
            </button>
          </div>

          <div className="Main-status" role="status" aria-live="polite">
            {isRecording
              ? 'Идёт запись…'
              : isTranscribing
                ? 'Распознаю речь…'
                : 'Запись остановлена.'}
          </div>

          {lastFileName ? <div className="Main-hint">Файл: {lastFileName}</div> : null}

          {transcript ? (
            <div className="Main-transcript">
              <div className="Main-transcriptTitle">Распознанный текст</div>
              <div className="Main-transcriptBody">{transcript}</div>
            </div>
          ) : null}

          {error ? (
            <div className="Main-error" role="alert">
              {error}
            </div>
          ) : null}
        </div>
      </header>
    </div>
  );
}

export default App;

