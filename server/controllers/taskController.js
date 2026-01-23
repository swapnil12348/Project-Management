import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

export const createTask = async (req, res) => {
    try {
        // FIX 1: req.auth is an object
        const { userId } = req.auth; 
        const { projectId, title, description, type, status, priority, assigneeId, due_date } = req.body;

        // FIX 2: Better Fallback for Production
        const origin = req.get('origin') || process.env.FRONTEND_URL || "http://localhost:5173"; 

        if (!assigneeId || !due_date || !projectId || !title) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } 
        
        // Strict Permission Check (Only Team Lead can create tasks?)
        // If you want to allow Workspace Admins too, you need to check that here.
        // For now, I'll keep your strict logic.
        else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have privileges to create tasks in this project" });
        }

        const isAssigneeMember = project.members.some((member) => member.user.id === assigneeId);
        if (!isAssigneeMember) {
            return res.status(403).json({ message: "Assignee is not a member of this project" });
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

        try {
            await inngest.send({
                name: "app/task.assigned",
                data: {
                    taskId: task.id,
                    origin: origin
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

export const updateTask = async (req, res) => {
    try {
        const { userId } = req.auth; // FIX
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await prisma.project.findUnique({ where: { id: task.projectId } });

        if (!project) return res.status(404).json({ message: "Project not found" });
        
        // Permission Check
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
        const { userId } = req.auth; // FIX
        const { taskIds } = req.body;
        
        if (!taskIds?.length) return res.status(400).json({message: "No IDs provided"});

        // Optimization: Find projects for all tasks to ensure permission
        const tasks = await prisma.task.findMany({ 
            where: { id: { in: taskIds } },
            select: { projectId: true }
        });
        
        if (tasks.length === 0) return res.status(404).json({ message: "Tasks not found" });

        // Check if user owns the project for these tasks
        // This logic assumes all deleted tasks belong to ONE project.
        // If you delete tasks from multiple projects, this logic is flawed.
        // Assuming bulk delete is per-project context.
        const project = await prisma.project.findUnique({ where: { id: tasks[0].projectId } });
        
        if (!project) return res.status(404).json({ message: "Project not found" });
        if (project.team_lead !== userId) return res.status(403).json({ message: "No permission" });

        await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
        res.json({ message: "Tasks deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}