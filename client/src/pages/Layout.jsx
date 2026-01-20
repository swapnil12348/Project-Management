import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, SignIn, useAuth, CreateOrganization } from '@clerk/clerk-react';
import { fetchWorkspaces } from '../features/workspaceSlice.js'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    // 1. Initial Fetch
    useEffect(() => {
        if (isLoaded && user && workspaces.length === 0) {
            dispatch(fetchWorkspaces({ getToken }));
        }
    }, [user?.id, isLoaded, workspaces.length, dispatch, getToken])

    // --- NEW FIX: POLLING MECHANISM ---
    // If Clerk has orgs, but Redux is empty, check DB every 2 seconds
    useEffect(() => {
        const hasClerkOrgs = user?.organizationMemberships?.length > 0;
        
        let interval;
        if (isLoaded && hasClerkOrgs && workspaces.length === 0) {
            interval = setInterval(() => {
                console.log("Syncing... Retrying fetch...");
                dispatch(fetchWorkspaces({ getToken }));
            }, 2000); // Try every 2 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoaded, user, workspaces.length, dispatch, getToken]);
    // ----------------------------------

    if (!isLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn />
            </div>
        )
    }

    const hasClerkOrganizations = user?.organizationMemberships?.length > 0;

    // SCENARIO A: User HAS an org in Clerk, but DB/Redux is still syncing or empty.
    if (hasClerkOrganizations && workspaces.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center h-screen bg-white dark:bg-zinc-950 gap-4'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
                <p className='text-sm text-gray-500'>Syncing your workspace...</p>
                {/* Optional Manual Button if it gets really stuck */}
                <button 
                    onClick={() => window.location.reload()}
                    className="text-xs text-blue-500 hover:underline"
                >
                    Taking too long? Click to reload
                </button>
            </div>
        )
    }

    // SCENARIO B: User has NO orgs in Clerk.
    if (!hasClerkOrganizations) {
        return (
            <div className='min-h-screen flex justify-center items-center'>
                <CreateOrganization 
                    afterCreateOrganizationUrl="/" 
                    skipInvitationScreen={true}
                />
            </div>
        )
    }

    // SCENARIO C: Dashboard
    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout