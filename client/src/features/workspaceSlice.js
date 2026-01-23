import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk('workspace/fetchWorkspaces', async ({getToken})=>{
    try {
        const {data}=await api.get('/api/workspaces', {headers: {Authorization: `Bearer ${await getToken()}`}});
        return data.workspaces || [];
    } catch (error) {
        console.log(error?.response?.data?.message || error.message)
        return [];
    }
})

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);
            // set current workspace to the new workspace
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            // FIX: Changed _id to id
            state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
            if (state.currentWorkspace?.id === action.payload) {
                state.currentWorkspace = null;
            }
        },
        addProject: (state, action) => {
            if (state.currentWorkspace && state.currentWorkspace.id === action.payload.workspaceId) {
                state.currentWorkspace.projects.push(action.payload);
            }
            
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.workspaceId 
                ? { ...w, projects: [...w.projects, action.payload] } 
                : w
            );
        },
        addTask: (state, action) => {
            // Update current workspace if it matches
            if (state.currentWorkspace) {
                const project = state.currentWorkspace.projects.find(p => p.id === action.payload.projectId);
                if (project) {
                    project.tasks.push(action.payload);
                }
            }

            // Update main workspaces list
            state.workspaces = state.workspaces.map((w) => {
                // Only update the workspace that contains this project
                const projectIndex = w.projects.findIndex(p => p.id === action.payload.projectId);
                if (projectIndex !== -1) {
                    const updatedProjects = [...w.projects];
                    updatedProjects[projectIndex] = {
                        ...updatedProjects[projectIndex],
                        tasks: [...updatedProjects[projectIndex].tasks, action.payload]
                    };
                    return { ...w, projects: updatedProjects };
                }
                return w;
            });
        },
        updateTask: (state, action) => {
            if (state.currentWorkspace) {
                const project = state.currentWorkspace.projects.find(p => p.id === action.payload.projectId);
                if (project) {
                    project.tasks = project.tasks.map(t => t.id === action.payload.id ? action.payload : t);
                }
            }

            state.workspaces = state.workspaces.map((w) => {
                const projectIndex = w.projects.findIndex(p => p.id === action.payload.projectId);
                if (projectIndex !== -1) {
                    const updatedProjects = [...w.projects];
                    updatedProjects[projectIndex] = {
                        ...updatedProjects[projectIndex],
                        tasks: updatedProjects[projectIndex].tasks.map(t => t.id === action.payload.id ? action.payload : t)
                    };
                    return { ...w, projects: updatedProjects };
                }
                return w;
            });
        },
        deleteTask: (state, action) => {
            const taskIds = action.payload; // Array of IDs

            // Helper to clean projects
            const cleanProject = (p) => ({
                ...p,
                tasks: p.tasks.filter(t => !taskIds.includes(t.id))
            });

            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map(cleanProject);
            }

            state.workspaces = state.workspaces.map(w => ({
                ...w,
                projects: w.projects.map(cleanProject)
            }));
        }
    },
    extraReducers: (builder)=>{
        builder.addCase(fetchWorkspaces.pending, (state)=>{
            state.loading=true;
        });
        builder.addCase(fetchWorkspaces.fulfilled, (state,action)=>{
            state.workspaces=action.payload;
            if (action.payload.length > 0) {
                const localStorageCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
                
                let found = null;
                if (localStorageCurrentWorkspaceId) {
                    found = action.payload.find((w)=>w.id === localStorageCurrentWorkspaceId);
                }
                
                state.currentWorkspace = found || action.payload[0];
            } else {
                state.currentWorkspace = null;
            }
            state.loading=false;
        });
        builder.addCase(fetchWorkspaces.rejected, (state)=>{
            state.loading=false;
        })
    }
});

export const { setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace, deleteWorkspace, addProject, addTask, updateTask, deleteTask } = workspaceSlice.actions;
export default workspaceSlice.reducer;