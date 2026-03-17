import axios, { AxiosResponse, AxiosInstance } from "axios";
import { IssuesResponse } from "../shared/issueResponse";

interface ProjectResponse {
    id: string;
    title: string;
}

interface Project
{
    id: string;
    title: string;
}

export class EtsService {
    private user: any;
    private api: AxiosInstance;

    constructor() {
        this.user = {};

        this.api = axios.create({
            baseURL: "https://ets.raftds.com/api", // ETS_DOMAIN,
          });
    }

    async authorize(login: string, password: string): Promise<void> {
        var payload = {
            username: login,
            password: password,
        };

        const response: AxiosResponse<any> = await this.api.post(`/auth/sign-in`, payload);

        if (response.status !== 200)
        {
            throw new Error("Failed to authorize");
        }
    
        //this.accessToken = response.data.access_token;
        this.user = response.data.employee_details;
        this.api.defaults.headers.common.Authorization = `Bearer ${response.data.access_token}`;
    }

    async getUserProjects(retryAuth?: boolean): Promise<Project[]> {
        const response: AxiosResponse<ProjectResponse[]> = await this.api.get(`/projects/`, {
            params: {
                employee_id: this.user.Id,
                office_id: this.user.office,
            },
          }
        );

        if (response.status === 200) {
            return response.data;
        } else if(response.status === 204 && retryAuth) {
            await this.authorize('', '');
            return await this.getUserProjects(false);
        }
        else {
            throw new Error("Failed to receive projects list");
        }
    }

    async getTypesForUserProjects(projects: Project[], retryAuth?: boolean): Promise<IssuesResponse[]> {
        const httpContent = projects.map(i => i.id);
        const response: AxiosResponse<IssuesResponse[]> = await this.api.post(`/task-types/`, { project_ids: httpContent });

        if (response.status === 200) {
            return response.data;
        } else if(response.status === 204 && retryAuth) {
            await this.authorize('', '');
            return await this.getTypesForUserProjects(projects, false);
        }
        else {
            throw new Error("Failed to receive task types list");
        }
    }

}