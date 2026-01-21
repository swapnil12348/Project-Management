import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { projectId, title, description, type, status, priority, assigneeId, due_date } = req.body;

        // --- EXPLANATION ---
        // We need 'origin' (e.g., http://localhost:5173) to create the link in the email.
        // req.get('origin') gets the frontend URL that called this API.
        // The || '' prevents a crash if the header is missing.
        const origin = req.get('origin') || "http://localhost:5173"; 

        // 1. Validation
        if (!assigneeId || !due_date || !projectId || !title) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        const isAssigneeMember = project.members.some((member) => member.user.id === assigneeId);
        if (!isAssigneeMember) {
            return res.status(403).json({ message: "Assignee is not a member of this project/workspace" });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                priority,
                type,
                assigneeId,
                status,
                due_date: new Date(due_date)
            }
        });

        // 2. Send Event to Inngest (Wrapped in try/catch so it doesn't break task creation)
        try {
            await inngest.send({
                name: "app/task.assigned",
                data: {
                    taskId: task.id,
                    origin: origin // This passes the URL to your email template
                }
            });
        } catch (err) {
            console.log("Email event failed, but task was created:", err);
        }

        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true }
        });

        res.json({ task: taskWithAssignee, message: "Task created successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

// ... updateTask and deleteTask remain the same as the previous correct version ...
export const updateTask = async (req, res) => {
    try {
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const { userId } = await req.auth();
        const project = await prisma.project.findUnique({ where: { id: task.projectId } });

        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "No permission" });

        const { title, description, status, type, priority, assigneeId, due_date } = req.body;

        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: {
                title, description, status, type, priority, assigneeId,
                due_date: due_date ? new Date(due_date) : undefined
            }
        });
        res.json({ task: updatedTask, message: "Task updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { taskIds } = req.body;
        
        if (!taskIds?.length) return res.status(400).json({message: "No IDs provided"});

        const tasks = await prisma.task.findMany({ where: { id: { in: taskIds } } });
        if (tasks.length === 0) return res.status(404).json({ message: "Tasks not found" });

        const project = await prisma.project.findUnique({ where: { id: tasks[0].projectId } });
        
        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "No permission" });

        await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
        res.json({ message: "Tasks deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}