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
        const ownerId = data.created_by;

        // --- 1. SAFETY CHECK: Ensure Owner Exists ---
        const userExists = await prisma.user.findUnique({ where: { id: ownerId } });

        if (!userExists) {
            await prisma.user.create({
                data: {
                    id: ownerId,
                    email: `temp_${ownerId}@placeholder.com`, // Temp email
                    name: "Syncing User...", // Temp name
                    image: "",
                }
            });
            console.log(`Created placeholder user for ${ownerId}`);
        }

        // --- 2. CREATE WORKSPACE ---
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
                ownerId: ownerId, // This is now guaranteed to exist
            }
        });

        // --- 3. ADD MEMBER ---
        await prisma.workspaceMember.upsert({
            where: {
                userId_workspaceId: {
                    userId: ownerId,
                    workspaceId: data.id
                }
            },
            update: {}, 
            create: {
                userId: ownerId,
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
        
        let roleEnum = "MEMBER";
        if (data.role === "org:admin") {
            roleEnum = "ADMIN";
        }

        const userId = data.public_user_data?.user_id || data.user_id;

        if (userId) {
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