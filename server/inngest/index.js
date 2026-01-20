import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// ----------------------------------------------------------------------
// USER SYNC
// ----------------------------------------------------------------------

const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk' },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        const { data } = event;
        
        const email = data.email_addresses?.[0]?.email_address;
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();

        // Use upsert to prevent unique constraint errors if webhook fires twice
        await prisma.user.upsert({
            where: { id: data.id },
            update: {
                email: email,
                name: name,
                image: data.image_url,
            },
            create: {
                id: data.id,
                email: email,
                name: name,
                image: data.image_url,
            }
        })
    }
)

const syncUserUpdation = inngest.createFunction(
    { id: 'update-user-from-clerk' },
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { data } = event;
        const email = data.email_addresses?.[0]?.email_address;
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();

        await prisma.user.update({
            where: { id: data.id },
            data: {
                email: email,
                name: name,
                image: data.image_url,
            }
        })
    }
)

const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk' },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.delete({
            where: { id: data.id }
        })
    }
)

// ----------------------------------------------------------------------
// WORKSPACE SYNC
// ----------------------------------------------------------------------

const syncWorkspaceCreation = inngest.createFunction(
    { id: 'sync-workspace-from-clerk' },
    { event: 'clerk/organization.created' },
    async ({ event }) => {
        const { data } = event;

        // 1. Create/Update the Workspace
        // Uses upsert to fix: "Unique constraint failed on the fields: (`id`)"
        await prisma.workspace.upsert({
            where: { id: data.id },
            update: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url,
            },
            create: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                image_url: data.image_url,
                ownerId: data.created_by, // Matches schema: ownerId
            }
        });

        // 2. Add Creator as ADMIN Member
        // Uses upsert on the Composite Key @@unique([userId, workspaceId])
        // This prevents crashing if the webhook runs twice
        await prisma.workspaceMember.upsert({
            where: {
                userId_workspaceId: {
                    userId: data.created_by,
                    workspaceId: data.id
                }
            },
            update: {}, // Do nothing if they are already a member
            create: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN"
            }
        });
    }
)

const syncWorkspaceUpdation = inngest.createFunction(
    { id: 'update-workspace-from-clerk' },
    { event: 'clerk/organization.updated' },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.update({
            where: { id: data.id },
            data: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url,
            }
        })        
    }
)

const syncWorkspaceDeletion = inngest.createFunction(
    { id: 'delete-workspace-with-clerk' },
    { event: 'clerk/organization.deleted' },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.delete({
            where: { id: data.id }
        })
    }
)

// ----------------------------------------------------------------------
// WORKSPACE MEMBER SYNC
// ----------------------------------------------------------------------

const syncWorkspaceMemberCreation = inngest.createFunction(
    { id: 'sync-workspace-member-from-clerk' },
    { event: 'clerk/organizationInvitation.accepted' },
    async ({ event }) => {
        const { data } = event;
        
        // Map Clerk role to Prisma Enum (ADMIN / MEMBER)
        // Clerk roles usually look like "org:admin" or "org:member"
        let roleEnum = "MEMBER";
        if (data.role === "org:admin") {
            roleEnum = "ADMIN";
        }

        // The user ID who accepted the invite is usually in 'public_user_data.user_id'
        // or sometimes directly on the object depending on API version.
        // We fallback safely.
        const userId = data.public_user_data?.user_id || data.user_id;

        if (userId) {
            // FIX: Was prisma.workspace.create, CHANGED TO prisma.workspaceMember
            await prisma.workspaceMember.upsert({
                where: {
                    userId_workspaceId: {
                        userId: userId,
                        workspaceId: data.organization_id
                    }
                },
                update: {
                    role: roleEnum
                },
                create: {
                    userId: userId,
                    workspaceId: data.organization_id,
                    role: roleEnum
                }
            });
        }
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