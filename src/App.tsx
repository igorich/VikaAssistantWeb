import { useEffect, useRef, useState } from 'react';
import './App.css';
import { ScenarioNo1 } from './app/scenariono1';

function App() {
  const API_KEY_STORAGE = 'vika_openai_api_key';
  const API_KEY_STORAGE_2 = 'vika_openai_api_key_2';
  const ETS_PASSWORD_STORAGE = 'ets_password';
  const ETS_LOGIN_STORAGE = 'ets_login';

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
  const [apiKey2, setApiKey2] = useState<string>(() => {
    try {
      return localStorage.getItem(API_KEY_STORAGE_2) || '';
    } catch {
      return '';
    }
  });
  const [etsPassword, setEtsPassword] = useState<string>(() => {
    try {
      return localStorage.getItem(ETS_PASSWORD_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [etsLogin, setEtsLogin] = useState<string>(() => {
    try {
      return localStorage.getItem(ETS_LOGIN_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showApiKey2, setShowApiKey2] = useState<boolean>(false);
  const [showEtsPassword, setShowEtsPassword] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const scenarioServiceRef = useRef<ScenarioNo1 | null>(null);

  if (!scenarioServiceRef.current) {
    scenarioServiceRef.current = new ScenarioNo1({
      setError,
      setLastFileName,
      setTranscript,
      streamRef,
      recorderRef,
      chunksRef,
      setIsTranscribing,
      setIsRecording,
    }, apiKey);
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
    if (!scenarioServiceRef.current)
      return;
    void scenarioServiceRef.current.start(isRecording);
  };

  const stopRecording = () => {
    if (!scenarioServiceRef.current)
      return;
    scenarioServiceRef.current.stopRecording(isRecording);
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

  const saveApiKey2 = () => {
    setError('');
    try {
      localStorage.setItem(API_KEY_STORAGE_2, apiKey2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить ключ в localStorage.';
      setError(message);
    }
  };

  const saveEtsPassword = () => {
    setError('');
    try {
      localStorage.setItem(ETS_PASSWORD_STORAGE, etsPassword);
      localStorage.setItem(ETS_LOGIN_STORAGE, etsLogin);
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

  const clearApiKey2 = () => {
    setError('');
    try {
      localStorage.removeItem(API_KEY_STORAGE_2);
    } catch {
      // ignore
    }
    setApiKey2('');
  };

  const clearEtsPassword = () => {
    setError('');
    try {
      localStorage.removeItem(ETS_PASSWORD_STORAGE);
      localStorage.removeItem(ETS_LOGIN_STORAGE);
    } catch {
      // ignore
    }
    setEtsPassword('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="Main">
          <h1 className="Main-title">Vika Assistant</h1>

          <div className="Main-layout">
            <div className="Main-left">
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

            <div className="Main-right">
              <div className="Main-key">
                <div className="Main-keyTitle">Ключ распознавания голоса (STT. OpenAI)</div>
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

              <div className="Main-key">
                <div className="Main-keyTitle">Ключ сервиса ИИ-сервиса</div>
                <div className="Main-keyRow">
                  <input
                    className="Main-keyInput"
                    type={showApiKey2 ? 'text' : 'password'}
                    placeholder="OpenAI API key #2 (сохранится в localStorage)"
                    value={apiKey2}
                    onChange={(e) => setApiKey2(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    className="Main-btn Main-btnSmall"
                    type="button"
                    onClick={() => setShowApiKey2((v) => !v)}
                  >
                    {showApiKey2 ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                <div className="Main-keyRow">
                  <button className="Main-btn Main-btnSecondary Main-btnSmall" type="button" onClick={saveApiKey2}>
                    Сохранить ключ
                  </button>
                  <button className="Main-btn Main-btnSecondary Main-btnSmall" type="button" onClick={clearApiKey2}>
                    Очистить
                  </button>
                </div>
                <div className="Main-keyHint">
                  Ключ хранится только в вашем браузере (localStorage) и отправляется напрямую в OpenAI.
                </div>
              </div>

              <div className="Main-key">
                <div className="Main-keyTitle">Авторизация в ETS</div>
                <div className="Main-keyRow">
                <input
                    className="Main-keyInput"
                    type='text'
                    placeholder="Логин ETS (сохранится в localStorage)"
                    value={etsLogin}
                    onChange={(e) => setEtsLogin(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <input
                    className="Main-keyInput"
                    type={showEtsPassword ? 'text' : 'password'}
                    placeholder="Пароль ETS (сохранится в localStorage)"
                    value={etsPassword}
                    onChange={(e) => setEtsPassword(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    className="Main-btn Main-btnSmall"
                    type="button"
                    onClick={() => setShowEtsPassword((v) => !v)}
                  >
                    {showEtsPassword ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                <div className="Main-keyRow">
                  <button className="Main-btn Main-btnSecondary Main-btnSmall" type="button" onClick={saveEtsPassword}>
                    Сохранить пароль
                  </button>
                  <button className="Main-btn Main-btnSecondary Main-btnSmall" type="button" onClick={clearEtsPassword}>
                    Очистить
                  </button>
                </div>
                <div className="Main-keyHint">
                  Пароль ETS хранится только в вашем браузере (localStorage).
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;

