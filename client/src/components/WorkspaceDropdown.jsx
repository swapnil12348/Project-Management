import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganizationList } from "@clerk/clerk-react";

function WorkspaceDropdown() {

    const { setActive, userMemberships, isLoaded } = useOrganizationList({
        userMemberships: {
            infinite: true, // Ensure we get all memberships
        },
    });
    
    const { openCreateOrganization } = useClerk();
    const { workspaces } = useSelector((state) => state.workspace);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onSelectWorkspace = (organizationId) => {
        // 1. Check if this workspace exists in our Redux store (Database)
        const existsInDb = workspaces.find(w => w.id === organizationId);
        
        if (!existsInDb) {
            // Edge Case: Clerk has it, but DB sync is pending.
            // We can set active in Clerk, but maybe warn the user or trigger a fetch?
            // For now, we allow it, assuming the Layout polling will fix it.
            console.warn("Workspace not yet synced to local DB");
        }

        setActive({ organization: organizationId });
        dispatch(setCurrentWorkspace(organizationId));
        setIsOpen(false);
        navigate('/');
    };

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync Clerk Active Org with Redux State
    useEffect(() => {
        if (currentWorkspace?.id && isLoaded) {
            // Only set if it's different to avoid loops
            setActive({ organization: currentWorkspace.id });
        }
    }, [currentWorkspace?.id, isLoaded]);

    // Fallback for image
    const workspaceImage = currentWorkspace?.image_url || currentWorkspace?.imageUrl;

    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors" >
                <div className="flex items-center gap-3 min-w-0">
                    {workspaceImage ? (
                        <img src={workspaceImage} alt="Workspace" className="w-8 h-8 rounded shadow object-cover flex-shrink-0" />
                    ) : (
                        <div className="w-8 h-8 rounded shadow bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-gray-500">
                            {currentWorkspace?.name?.[0] || "?"}
                        </div>
                    )}
                    
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {currentWorkspace?.name || "Select Workspace"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0 ml-2" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0 mt-1 max-h-96 overflow-y-auto">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        
                        {/* Map through Clerk memberships directly */}
                        {userMemberships?.data?.map(({ organization }) => (
                            <div 
                                key={organization.id} 
                                onClick={() => onSelectWorkspace(organization.id)} 
                                className={`flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${currentWorkspace?.id === organization.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <img src={organization.imageUrl} alt={organization.name} className="w-6 h-6 rounded object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                        {organization.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                        {organization.membersCount || 0} members
                                    </p>
                                </div>
                                {currentWorkspace?.id === organization.id && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-200 dark:border-zinc-700 p-2">
                        <div onClick={() => { openCreateOrganization(); setIsOpen(false) }} className="flex items-center gap-2 p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800 text-blue-600 dark:text-blue-400 transition-colors" >
                            <Plus className="w-4 h-4" /> 
                            <span className="text-xs font-medium">Create Workspace</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceDropdown;