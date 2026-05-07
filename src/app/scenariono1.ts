import { Dispatch, RefObject, SetStateAction } from "react";
import { EtsService } from "./etsService";
import { StartRecording } from "./startRecording";

interface StartRecordingDeps {
    setError: Dispatch<SetStateAction<string>>;
    setLastFileName: Dispatch<SetStateAction<string>>;
    setTranscript: Dispatch<SetStateAction<string>>;
    streamRef: RefObject<MediaStream | null>;
    recorderRef: RefObject<MediaRecorder | null>;
    chunksRef: RefObject<Blob[]>;
    setIsTranscribing: Dispatch<SetStateAction<boolean>>;
    setIsRecording: Dispatch<SetStateAction<boolean>>;
  }

const ETS_PASSWORD_STORAGE = 'ets_password';
const ETS_LOGIN_STORAGE = 'ets_login';

export class ScenarioNo1 {
  
    private readonly deps: StartRecordingDeps;
    private runner1: StartRecording;
   
    constructor(deps: StartRecordingDeps, openAIApiKey: string, ) {
        this.deps = deps;
        this.runner1 = new StartRecording(deps, openAIApiKey);
    }

    async start(isRecording: boolean): Promise<void> {
        this.runner1.start(isRecording);
    }

    async stopRecording(isRecording: boolean): Promise<void> {
        this.runner1.stop(isRecording);

        const login = localStorage.getItem(ETS_LOGIN_STORAGE) || '';
        const password = localStorage.getItem(ETS_PASSWORD_STORAGE) || '';

        const ets = new EtsService();        
        await ets.authorize(login, password);
        const projects = await ets.getUserProjects(true);
        const fullProjectsData = await ets.getTypesForUserProjects(projects, true);

        fullProjectsData.forEach(i => {
            i.ProjectName = projects.find(j => j.id == i.project_id)?.title ?? '';
        });

        this.deps.setTranscript(this.runner1.transcript);
        
        const detectedTasks = await this.runner1.runTasksDetection(fullProjectsData, this.runner1.transcript);
        console.log(JSON.stringify(detectedTasks));

        this.deps.setTranscript(detectedTasks ?? 'ничего не распознано');
    }
}