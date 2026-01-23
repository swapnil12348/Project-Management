import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import { fetchWorkspaces } from "../features/workspaceSlice";
import toast from "react-hot-toast";

const AddProjectMember = ({ isDialogOpen, setIsDialogOpen }) => {

    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');

    const { getToken } = useAuth();
    const dispatch = useDispatch();

    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);

    // SAFETY CHECK 1: Ensure project exists before rendering to prevent crash
    const project = currentWorkspace?.projects?.find((p) => p.id === id);
    
    // SAFETY CHECK 2: Handle empty members array
    const projectMembersEmails = project?.members?.map((member) => member.user.email) || [];

    const [email, setEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!project) return;

        setIsAdding(true)

        try {
            await api.post(`/api/projects/${project.id}/addMember`, 
                { email }, 
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            )
            toast.success("Added to project successfully");
            setEmail(''); // Reset email
            setIsDialogOpen(false);
            dispatch(fetchWorkspaces({ getToken }));
        } catch (error) {
            // Note: If user doesn't exist, Backend returns 404 "User not found"
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setIsAdding(false);
        }
    };

    if (!isDialogOpen) return null;
    
    // CRITICAL FIX: Don't render modal contents if project data is missing
    if (!project) return null; 

    // Filter list for the suggestions
    const availableMembers = currentWorkspace?.members?.filter(
        (member) => !projectMembersEmails.includes(member.user.email)
    ) || [];

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus className="size-5 text-zinc-900 dark:text-zinc-200" /> Add Member to Project
                    </h2>
                    <p className="text-sm text-zinc-700 dark:text-zinc-400">
                        Adding to Project: <span className="text-blue-600 dark:text-blue-400">{project.name}</span>
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 w-4 h-4" />
                            
                            {/* FIX: Changed from <select> to <input list="..."> */}
                            {/* This allows typing ANY email OR selecting from the list */}
                            <input 
                                type="email"
                                id="email"
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="Enter or select email..."
                                list="workspace-members"
                                className="pl-10 mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 py-2 focus:outline-none focus:border-blue-500" 
                                required 
                            />

                            {/* Datalist provides the dropdown suggestions */}
                            <datalist id="workspace-members">
                                {availableMembers.map((member) => (
                                    <option key={member.user.id} value={member.user.email} />
                                ))}
                            </datalist>

                        </div>
                        <p className="text-xs text-zinc-500">
                            Tip: If the user is not in the list, type their email. They must be registered in the app.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsDialogOpen(false)} className="px-5 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition" >
                            Cancel
                        </button>
                        <button type="submit" disabled={isAdding} className="px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white disabled:opacity-50 transition" >
                            {isAdding ? "Adding..." : "Add Member"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProjectMember;