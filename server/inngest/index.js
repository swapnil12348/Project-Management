import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// ----------------------------------------------------------------------
// USER & WORKSPACE SYNC (Previous Code - Kept as is)
// ----------------------------------------------------------------------

const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk' },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        const { data } = event;
        const email = data.email_addresses?.[0]?.email_address;
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
        if (!email) return;
        await prisma.user.upsert({
            where: { id: data.id },
            update: { email, name, image: data.image_url || "" },
            create: { id: data.id, email, name, image: data.image_url || "" }
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
        if (!email) return; 
        await prisma.user.upsert({
            where: { id: data.id },
            update: { email, name, image: data.image_url || "" },
            create: { id: data.id, email, name, image: data.image_url || "" }
        })
    }
)

const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk' },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        try { await prisma.user.delete({ where: { id: event.data.id } }) } catch (e) {}
    }
)

const syncWorkspaceCreation = inngest.createFunction(
    { id: 'sync-workspace-from-clerk' },
    { event: 'clerk/organization.created' },
    async ({ event }) => {
        const { data } = event;
        const ownerId = data.created_by;
        const userExists = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!userExists) {
            await prisma.user.create({
                data: { id: ownerId, email: `temp_${ownerId}@placeholder.com`, name: "Syncing User...", image: "" }
            });
        }
        await prisma.workspace.upsert({
            where: { id: data.id },
            update: { name: data.name, slug: data.slug, image_url: data.image_url || "" },
            create: { id: data.id, name: data.name, slug: data.slug, image_url: data.image_url || "", ownerId }
        });
        await prisma.workspaceMember.upsert({
            where: { userId_workspaceId: { userId: ownerId, workspaceId: data.id } },
            update: { role: "ADMIN" }, 
            create: { userId: ownerId, workspaceId: data.id, role: "ADMIN" }
        });
    }
)

const syncWorkspaceUpdation = inngest.createFunction(
    { id: 'update-workspace-from-clerk' },
    { event: 'clerk/organization.updated' },
    async ({ event }) => {
        try {
            await prisma.workspace.update({
                where: { id: event.data.id },
                data: { name: event.data.name, slug: event.data.slug, image_url: event.data.image_url || "" }
            })
        } catch (e) {}       
    }
)

const syncWorkspaceDeletion = inngest.createFunction(
    { id: 'delete-workspace-with-clerk' },
    { event: 'clerk/organization.deleted' },
    async ({ event }) => {
        try { await prisma.workspace.delete({ where: { id: event.data.id } }) } catch (e) {}
    }
)

const syncWorkspaceMemberCreation = inngest.createFunction(
    { id: 'sync-workspace-member-from-clerk' },
    { event: 'clerk/organizationMembership.created' }, 
    async ({ event }) => {
        const { data } = event;
        let roleEnum = data.role === "org:admin" ? "ADMIN" : "MEMBER";
        const userId = data.public_user_data.user_id;
        const workspaceId = data.organization.id;

        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
            await prisma.user.create({
                data: { id: userId, email: `temp_${userId}@placeholder.com`, name: "Syncing Member...", image: "" }
            });
        }
        await prisma.workspaceMember.upsert({
            where: { userId_workspaceId: { userId, workspaceId } },
            update: { role: roleEnum },
            create: { userId, workspaceId, role: roleEnum }
        });
    }
)

const syncWorkspaceMemberUpdate = inngest.createFunction(
    { id: 'sync-workspace-member-update-from-clerk' },
    { event: 'clerk/organizationMembership.updated' },
    async ({ event }) => {
        const { data } = event;
        let roleEnum = data.role === "org:admin" ? "ADMIN" : "MEMBER";
        await prisma.workspaceMember.updateMany({
            where: { userId: data.public_user_data.user_id, workspaceId: data.organization.id },
            data: { role: roleEnum }
        });
    }
);

const syncWorkspaceMemberDeletion = inngest.createFunction(
    { id: 'sync-workspace-member-delete-from-clerk' },
    { event: 'clerk/organizationMembership.deleted' },
    async ({ event }) => {
        await prisma.workspaceMember.deleteMany({
            where: { userId: event.data.public_user_data.user_id, workspaceId: event.data.organization.id }
        });
    }
);

// ----------------------------------------------------------------------
// TASK EMAILS (CORRECTED)
// ----------------------------------------------------------------------

const sendTaskAssignmentEmail = inngest.createFunction(
    { id: "send-task-assignment-email" },
    { event: "app/task.assigned" },
    async ({ event, step }) => {
        const { taskId, origin } = event.data;

        // --- STEP 1: Fetch and Send Initial Email ---
        // We use step.run so Inngest retries this block if email fails, without re-triggering the whole function
        const task = await step.run("fetch-task-and-send-email", async () => {
            const taskData = await prisma.task.findUnique({
                where: { id: taskId },
                include: { assignee: true, project: true }
            });

            if (!taskData) {
                // If task was deleted immediately, throw error or return null to stop execution
                throw new Error("Task not found");
            }

            await sendEmail({
                to: taskData.assignee.email,
                subject: `New task assignment in ${taskData.project.name}`,
                // FIX: Added '$' to {origin} and fixed HTML attributes
                body: `
                <div style="max-width: 600px;">
                    <h2>Hi ${taskData.assignee.name}, </h2> 
                    
                    <p style="font-size: 16px;">You've been assigned a new task:</p>
                    <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${taskData.title}</p>
        
                    <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                        <p style="margin: 6px 0;"><strong>Description:</strong> ${taskData.description || "No description"}</p>
                        <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(taskData.due_date).toLocaleDateString()}</p>
                    </div>
                    
                    <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                       View Task
                    </a>
        
                    <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                       Please make sure to review and complete it before the due date.
                    </p>
                </div>`
            });

            return taskData;
        });

        // Safety check if step 1 failed or returned null (though throw handles it)
        if (!task) return;

        // --- STEP 2: Sleep ---
        // Only sleep if the date is in the future
        const dueDate = new Date(task.due_date);
        const now = new Date();
        
        // If due date is not today/past, wait
        if (dueDate > now) {
            await step.sleepUntil('wait-for-due-date', dueDate);
        }

        // --- STEP 3: Check Status ---
        // FIX: We cannot nest 'send-task-reminder-mail' inside this step.
        // We must check status here and return a boolean.
        const isTaskIncomplete = await step.run('check-if-task-is-completed', async () => {
            const currentTask = await prisma.task.findUnique({
                where: { id: taskId },
                select: { status: true }
            });

            // If task was deleted during the sleep, we consider it "handled" (false)
            if (!currentTask) return false;

            return currentTask.status !== "DONE";
        });

        // --- STEP 4: Send Reminder (Conditional) ---
        if (isTaskIncomplete) {
            await step.run('send-task-reminder-mail', async () => {
                // Fetch fresh data for the email
                const reminderTask = await prisma.task.findUnique({
                    where: { id: taskId },
                    include: { assignee: true, project: true }
                });

                if (!reminderTask) return;

                await sendEmail({
                    to: reminderTask.assignee.email,
                    subject: `Reminder for ${reminderTask.project.name}`,
                    // FIX: Fixed HTML syntax errors (closing quotes, colons)
                    body: `
                    <div style="max-width: 600px">
                        <h2>Hi ${reminderTask.assignee.name}, </h2>
                        <p style="font-size: 16px;">You have a task due in ${reminderTask.project.name}</p>
                        <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${reminderTask.title}</p>

                        <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                            <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(reminderTask.due_date).toLocaleDateString()}</p>                               
                        </div>

                        <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                            View Task
                        </a>

                        <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                            Please make sure to review and complete it before the due date.
                        </p>
                    </div>`
                });
            });
        }
    }
);

export const functions = [
    sendTaskAssignmentEmail,
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncWorkspaceCreation,
    syncWorkspaceUpdation,
    syncWorkspaceDeletion,
    syncWorkspaceMemberCreation,
    syncWorkspaceMemberUpdate, 
    syncWorkspaceMemberDeletion
];