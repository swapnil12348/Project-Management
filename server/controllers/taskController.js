import prisma from "../configs/prisma.js";

export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { projectId, title, description, type, status, priority, assigneeId, due_date } = req.body;
        
        // Remove unused variable 'origin'

        // 1. VALIDATION: Check required fields based on Schema
        if (!assigneeId || !due_date || !projectId || !title) {
            return res.status(400).json({ message: "Missing required fields: projectId, title, assigneeId, or due_date" });
        }

        // check if user has admin role for project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });

        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        // Check if assignee is a member
        const isAssigneeMember = project.members.some((member) => member.user.id === assigneeId);
        if (!isAssigneeMember) {
            return res.status(403).json({ message: "Assignee is not a member of this project/workspace" });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                priority,   // Ensure this matches Enum (LOW, MEDIUM, HIGH)
                type,       // FIX: Added 'type' (was missing in your create call)
                assigneeId, // FIX: Schema says this is String (Required)
                status,
                due_date: new Date(due_date)
            }
        });

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

//update task

export const updateTask = async (req, res) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: req.params.id }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const { userId } = await req.auth();

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } }

        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        // FIX: Destructure specific fields to update. 
        // passing 'req.body' directly is dangerous (could change projectId)
        const { title, description, status, type, priority, assigneeId, due_date } = req.body;

        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: {
                title,
                description,
                status,
                type,
                priority,
                assigneeId,
                due_date: due_date ? new Date(due_date) : undefined
            }
        });

        res.json({ task: updatedTask, message: "Task updated successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }

}

//delete task

export const deleteTask = async (req, res) => {
    try {
        // FIX: Added 'await' to match previous functions (assuming Clerk v4)
        const { userId } = await req.auth();
        const { taskIds } = req.body;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
             return res.status(400).json({message: "No task IDs provided"});
        }

        const tasks = await prisma.task.findMany({
            where: { id: { in: taskIds } }
        });

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Tasks not found" });
        }

        // FIX: Security check. 
        // We grab the projectId from the first task found.
        const projectIdToCheck = tasks[0].projectId;

        // Ensure ALL requested tasks belong to this same project
        // Otherwise a user could delete tasks from other projects by mixing IDs
        const allTasksInSameProject = tasks.every(t => t.projectId === projectIdToCheck);
        if (!allTasksInSameProject) {
            return res.status(400).json({ message: "Cannot delete tasks from multiple projects at once" });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectIdToCheck },
            // optimization: no need to include members here, just checking lead
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        await prisma.task.deleteMany({
            where: { id: { in: taskIds } }
        });

        res.json({ message: "Tasks deleted successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }

}