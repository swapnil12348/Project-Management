import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// inngest function to save user to a database 
const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk' },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        const { data } = event;
        
        // FIX 1: Corrected typos in email_addresses and email_address
        // FIX 2: Added optional chaining (?.) before [0] to prevent crashes if array is empty
        const email = data.email_addresses?.[0]?.email_address;
        
        // FIX 3: Handle cases where first or last name might be null
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();

        await prisma.user.create({
            data: {
                id: data.id,
                email: email,
                name: name,
                image: data.image_url,
            }
        })
    }
)

/// Inngest function to delete user from database 
const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk' },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.delete({
            where: {
                id: data.id,
            }
        })
    }
)

// Inngest function to update user data in database
const syncUserUpdation = inngest.createFunction(
    { id: 'update-user-from-clerk' },
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { data } = event;
        
        // Apply same fixes here
        const email = data.email_addresses?.[0]?.email_address;
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();

        await prisma.user.update({
            where: {
                id: data.id
            },
            data: {
                email: email,
                name: name,
                image: data.image_url,
            }
        })
    }
)

//Inngest function to save workspace data to a databse

const syncWorkspaceCreation=inngest.createFunction(
    {id: 'sync-workspace-from-clerk' },
    {event: 'clerk/organization.created'},
    async ({event}) => {
        const {data}=event;
        await prisma.workspace.create({
            data:{
                id:data.id,
                name:data.name,
                slug:data.slug,
                ownerId:data.created_by,
                image_url:data.image_url,
            }
        })

        // ADD CREATOR as ADMIN member

        await prisma.workspaceMember.create({
            data:{
                userId:data.created_by,
                workspace:data.id,
                role:"ADMIN"
            }
        })
        
    }
)

//inngest function to update workspace data in database

const syncWorkspaceUpdation=inngest.createFunction(
    {id:'update-workspace-from-clerk'},
    {event:'clerk/organization.updated'},
    async ({event}) => {
        const {data}= event;
        await prisma.workspace.update({
            where:{
                id:data.id
            },
            data:{
                name:data.name,
                slug:data.slug,
                image_url:data.image_url,
            }

        })        
    }
)

//inngest function to delet workspace from database

const syncWorkspaceDeletion=inngest.createFunction(
    {id:'delete-workspace-with-clerk'},
    {event:'clerk/organization.deleted'},
    async ({event}) => {
        const {data} = event;
        await prisma.workspace.delete({
            where:{
                id:data.id
            }
        })
        
    }
)

//inngest function to save workspace memeber data to a database

const syncWorkspaceMemberCreation=inngest.createFunction(
    {id:'sync-workspace-member-from-clerk'},
    {event:'clerk/organizationInvitation.accepted'},
    async ({event}) => {
        const {data}=event;
        await prisma.workspace.create({
            data:{
                userId:data.user_id,
                workspaceId: data.organization_id,
                role: String(data.role_name).toUpperCase(),
            }
        })
        
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncWorkspaceCreation,
    syncWorkspaceUpdation,
    syncWorkspaceDeletion,
    syncWorkspaceMemberCreation,
];