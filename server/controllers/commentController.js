import prisma from "../configs/prisma.js"

// add comment
export const addComment = async (req, res) => {
    try {
        // FIX 1: Remove () from req.auth
        const { userId } = req.auth; 
        const { content, taskId } = req.body

        // check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        })

        // FIX 2: Handle missing task to prevent crash
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // check project and members
        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: true } // Removed nested include to save DB perf, we only need userIds
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Check if user is member OR Workspace Admin (Optional robustness)
        // For now, sticking to your logic: Must be project member
        const isMember = project.members.some((member) => member.userId === userId);

        if (!isMember) {
            return res.status(403).json({ message: "You are not a member of this project" });
        }

        const comment = await prisma.comment.create({
            data: { taskId, content, userId },
            include: { user: true }
        })

        res.json({ comment })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.code || error.message })
    }
} 

// get comments for task
export const getTaskComments = async (req, res) => {
    try {
        const { taskId } = req.params;
        
        // Optional: You might want to check permissions here too, 
        // but for now, fetching is safe enough.
        
        const comments = await prisma.comment.findMany({
            where: { taskId }, 
            include: { user: true },
            orderBy: { createdAt: 'asc' } // Good practice to order comments
        })

        res.json({ comments })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.code || error.message })
    }
}