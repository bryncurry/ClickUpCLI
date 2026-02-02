import dotenv from 'dotenv';
dotenv.config();

const API_BASE = "https://api.clickup.com/api/v2";

export interface ClickUpUser {
    id: number;
    username: string;
    email: string;
    color: string;
}

export interface ClickUpTeam {
    id: string;
    name: string;
    color: string;
    avatar: string;
    members: { user: ClickUpUser }[];
}

export interface ClickUpTask {
    id: string;
    name: string;
    status: { status: string };
    url: string;
}

export interface TimeEntry {
    id: string;
    task: ClickUpTask;
    start: string;
    end?: string;
    duration?: string;
    description?: string;
}

export class ClickUpClient {
    private apiKey: string;
    private defaultTeamId?: string;
    private userId?: number;

    constructor() {
        const key = process.env.CLICKUP_API_KEY;
        if (!key) {
            throw new Error("CLICKUP_API_KEY is not defined in environment variables");
        }
        this.apiKey = key;
    }

    // https://developer.clickup.com/docs/Getting%20Started
    // You must include your personal api key in specifically the Authorization header of every request.
    private async request(endpoint: string, method: string = 'GET', body?: any) {
        const headers = {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
        };

        // https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
        const config: RequestInit = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        };

        const response = await fetch(`${API_BASE}${endpoint}`, config);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`ClickUp API Error ${response.status}: ${text}`);
        }
        return response.json();
    }

    /**
     * Gets the user using the clickup api, which it can determine by providing the api key.
     */
    async getMe(): Promise<ClickUpUser> {
        if (this.userId) return { id: this.userId } as ClickUpUser;
        const data = await this.request('/user');
        this.userId = data.user.id;
        return data.user;
    }

    /**
     * Returns a list of the teams the current user is on.
     */
    async getTeams(): Promise<ClickUpTeam[]> {
        const data = await this.request('/team');
        return data.teams;
    }

    async getDefaultTeamId(): Promise<string> {
        if (this.defaultTeamId) return this.defaultTeamId;
        const teams = await this.getTeams();
        if (teams.length === 0) throw new Error("No teams found");
        this.defaultTeamId = teams[0].id;
        return this.defaultTeamId;
    }

    async getAssignedTasks(): Promise<ClickUpTask[]> {
        const teamId = await this.getDefaultTeamId();
        const me = await this.getMe();
        const data = await this.request(`/team/${teamId}/task?assignees[]=${me.id}&include_closed=false&subtasks=true`);
        return data.tasks;
    }

    async searchTasks(query: string): Promise<ClickUpTask[]> {
        const teamId = await this.getDefaultTeamId();
        // Lists (which we get out of the Get Filtered Teams Task endpoint that we're using here) are
        // called Views in the Clickup documentation. They specifically allow for using the search parameter.
        // https://developer.clickup.com/docs/filter-views
        const data = await this.request(`/team/${teamId}/task?search=${encodeURIComponent(query)}&include_closed=false`);
        return data.tasks;
    }

    async startTimer(taskId: string, description?: string): Promise<any> {
        const teamId = await this.getDefaultTeamId();
        return this.request(`/team/${teamId}/time_entries/start`, 'POST', {
            tid: taskId,
            description: description
        });
    }

    /**
     * Stops the current timer.
     */
    async stopTimer(): Promise<any> {
        const teamId = await this.getDefaultTeamId();
        return this.request(`/team/${teamId}/time_entries/stop`, 'POST');
    }

    /**
     * Gets the recent time entries for the current user, sorted by start time descending (newest first).
     */
    async getRecentTimeEntries(): Promise<TimeEntry[]> {
        const teamId = await this.getDefaultTeamId();
        const data = await this.request(`/team/${teamId}/time_entries?limit=10`);
        // API returns ascending (oldest first), reverse to get newest first
        if (data.data && Array.isArray(data.data)) {
            return data.data.sort((a: TimeEntry, b: TimeEntry) => {
                return parseInt(b.start) - parseInt(a.start);
            });
        }
        return [];
    }


    async getRunningTimer(): Promise<TimeEntry | null> {
        const teamId = await this.getDefaultTeamId();
        // Default to authenticated user
        const data = await this.request(`/team/${teamId}/time_entries/current`);
        return data.data;
    }
}
