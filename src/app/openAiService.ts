import { IssuesResponse } from "../shared/issueResponse";
import { StartRecordingDeps } from "../shared/startRecordingDeps";

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

export class OpenAiService {
  private prompt: string;
    constructor(
    private readonly deps: StartRecordingDeps,
    private readonly apiKey: string,
  ) {
    this.prompt = this.initPromptTemplate('', []);
   }

  async runTranscript(mimeType: string): Promise<string | null> {
    try {
      //return 'тестовая транскрибация. 5 минут на Ангстреме';
      const trimmedKey = this.apiKey.trim();
      if (!trimmedKey) {
        throw new Error('Введите OpenAI API key (он хранится в localStorage этого браузера).');
      }

      const type = mimeType; // recorder.mimeType || this.mimeType || 'audio/webm';
      const blob = new Blob(this.deps.chunksRef.current, { type });
      this.deps.chunksRef.current = [];

      const ext = type.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
      this.deps.setLastFileName(fileName);

      this.deps.setIsTranscribing(true);
      this.deps.setTranscript('');

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
      this.deps.setTranscript(json.text as string);

      return json.text as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось распознать речь.';
      this.deps.setError(message);
    } finally {
      this.deps.setIsTranscribing(false);
      this.cleanup();
    }

    return null;
  }

  async runTasksDetection(projectsData: IssuesResponse[], speech: string): Promise<string | null> {
    this.prompt = this.initPromptTemplate(speech, projectsData);
    try {
      const trimmedKey = this.apiKey.trim();
      if (!trimmedKey) {
        throw new Error('Введите OpenAI API key (он хранится в localStorage этого браузера).');
      }

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmedKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content:
                'Ты помощник, который кратко и чётко описывает, какие задачи нужно выполнить пользователю. Отвечай по-русски.',
            },
            {
              role: 'user',
              content: this.prompt,
            },
          ],
        }),
      });

      const json = (await resp.json().catch(() => ({}))) as any;

      if (!resp.ok) {
        const errObj = json.error;
        const msg =
          (typeof errObj === 'object' && errObj && 'message' in errObj && errObj.message) ||
          (typeof errObj === 'string' && errObj) ||
          'Ошибка обращения к текстовому сервису.';
        throw new Error(msg);
      }

      const text: string =
        json.choices?.[0]?.message?.content?.trim?.() ||
        json.choices?.[0]?.message?.content ||
        '';

      if (!text) {
        throw new Error('Пустой ответ от текстового сервиса.');
      }

      return text;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось получить ответ от текстового сервиса.';
      this.deps.setError(message);
      return null;
    }
  }

  private cleanup() {
    try {
      this.deps.streamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    this.deps.streamRef.current = null;
    this.deps.recorderRef.current = null;
    this.deps.setIsRecording(false);
  }

  private initPromptTemplate(speech: string, projectsData: IssuesResponse[]): string {
    return "### input information ###: Пользователь голосом сообщает команду запланировать или записать количество часов на выполнение работы. " +
    "Запись транскрибируется. Тебе для обработки предоставляется расшифровка записи.\n\n" +
    "### your task ###: Проанализируй расшифровку. Выдели из расшифровки и верни в формате JSON название проекта и ID проекта, название задачи и ID задачи, " +
    "описание задачи и время выполнения, по следующим правилам:\n" +
    "\t 1) Название проекта должно быть выбрано СТРОГО из списка проектов \"Projects\". В списке есть названия проектов на русском и английском. " +
    "В расшифровке, английское название может быть написано русскими буквами. Учитывай это. Выбери, какой проект списка проектов подходит по расшифровке, " +
    "с учётом ошибочной транслитерации. Если не определить, укажи - null.\n" +
    "\t 2) ID проекта подставь СТРОГО соответствующее названию проекта из списка проектов. Если не определить, укажи - null.\n" +
    "\t 3) Название задачи должно быть выбрано СТРОГО из списка задач \"task_types\". В списке есть названия задач на русском и английском. " +
    "В расшифровке, английское название задачи быть написано русскими буквами. Учитывай это. Выбери, какая задача из списка задач подходит по расшифровке, " +
    "с учётом ошибочной транслитерации. Если не определить, укажи - null.\n" +
    "\t 4) ID задачи подставь СТРОГО соответствующее названию задачи из списка задач. Если не определить, укажи - null.\n" +
    "\t 5) Описание задачи приведи так, как оно сказано в расшифровке. Если требуется, скорректируй расшифровку в соответствии с правилами русского языка, " +
    "удали повторы слов, лишние предлоги и т.д. НЕ ИСКАЖАЙ описание и не придумывай ничего. Создай описание максимально близко к тексту или просто " +
    "процитируй расшифровку. Если не определить, укажи - Требуется уточнение.\n" +
    "\t 6) Выдели из текста время, в течение которого человек занимался задачей. Укажи его в минутах, целым количеством минут " +
    "(например час - это 60, пол часа - это 30, два часа - 120 и т.д.). Если время не определить из расшифровки, укажи 30.\n\n" +
    "Все собранные данные представь в формате JSON, по примеру:\n\n" +
    "### Transcript for analysis: ###\n" +
    `${speech}\n\n` +
    "### Projects and Tasks for selection: ###\n" +
    `${JSON.stringify(projectsData)}\n\n` +
    "Все собранные данные представь в формате JSON, по примеру:\n\n" +
    "### output format ###:\n" +
    "\t \"Project\": \"название проекта\",\n" +
    "\t \"ProjectId\": \"ID проекта соответствующий названию\",\n" +
    "\t \"Task\": \"название задачи\",\n" +
    "\t \"TaskId\": \"ID задачи соответствующее задаче\",\n" +
    "\t \"Description\": \"описание работ из расшифровки\",\n" +
    "\t \"Minutes\": \"время затраченное на выполнение работы (целочисленное значение)\".\n" +
    "Верни только JSON без каких либо комментариев.\n";
  }
}