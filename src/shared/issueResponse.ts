import { Issue } from "./issue";

export interface IssuesResponse
{
    project_id: string;
    ProjectName: string;
    task_types: Issue[];
}
