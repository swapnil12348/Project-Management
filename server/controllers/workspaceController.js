import prisma from "../configs/prisma.js"

// get all workspaces for user
export const getUserWorkspaces = async (req, res) => {
    try {
        const { userId } = req.auth; // FIX
        const workspaces = await prisma.workspace.findMany({
            where: {
                members: { some: { userId: userId } }
            },
            include: {
                members: { include: { user: true } },
                projects: {
                    include: {
                        tasks: { include: { assignee: true, comments: { include: { user: true } } } },
                        members: { include: { user: true } }
                    }
                },
                owner: true
            }
        });
        res.json({ workspaces })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.code || error.message })
    }
}

// add member to workspace
export const addMember = async (req, res) => {
    try {
        const { userId } = req.auth; // FIX
        const { email, role, workspaceId, message } = req.body;

        // check if target user exists in our DB
        const targetUser = await prisma.user.findUnique({
            where: { email }
        })

        if (!targetUser) {
            // NOTE: In production, you might want to invite via Clerk email here
            return res.status(404).json({ message: "User not found in system. Please invite them via Clerk first." })
        }

        if (!workspaceId || !role) {
            return res.status(400).json({ message: "Missing required parameters" })
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" })
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }, include: { members: true }
        })

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" })
        }

        // check creator has admin role
        if (!workspace.members.find((member) => member.userId === userId && member.role === "ADMIN")) {
            return res.status(401).json({ message: "You do not have admin privileges" })
        }

        // check if target user is already member
        // FIX: Check targetUser.id, not userId (which is you)
        const existingMember = workspace.members.find((member) => member.userId === targetUser.id);

        if (existingMember) {
            return res.status(400).json({ message: "User is already a member of this workspace" })
        }

        // FIX: Use workspaceMember.create, NOT workspace.create
        const member = await prisma.workspaceMember.create({
            data: {
                userId: targetUser.id,
                workspaceId,
                role,
                message: message || ""
            }
        })

        res.json({ member, message: "Member added successfully" })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.code || error.message })
    }
}