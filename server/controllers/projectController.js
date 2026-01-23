import prisma from "../configs/prisma.js";

// create project
export const createProject = async (req, res) => {
    try {
        const { userId } = req.auth; // REMOVED await and ()
        const { workspaceId, description, name, status, start_date, end_date, team_members, team_lead, progress, priority } = req.body;

        // ... (rest of logic is correct)
        
        // check if user has admin role in workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: true }
        });

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        const isWorkspaceAdmin = workspace.members.some(
            (member) => member.userId === userId && member.role === "ADMIN"
        );

        if (!isWorkspaceAdmin) {
            return res.status(403).json({ message: "You don't have permission to create projects in this workspace" });
        }

        let teamLeadId = userId;
        
        if (team_lead) {
            const teamLeadUser = await prisma.user.findUnique({
                where: { email: team_lead },
                select: { id: true }
            });

            if (!teamLeadUser) {
                return res.status(404).json({ message: `Team lead (${team_lead}) not found in database.` });
            }
            teamLeadId = teamLeadUser.id;
        }

        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress: progress ? parseInt(progress) : 0,
                team_lead: teamLeadId,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        });

        if (team_members?.length > 0) {
            const workspaceMembers = await prisma.workspaceMember.findMany({
                where: { workspaceId },
                include: { user: true }
            });

            const membersToAdd = [];
            workspaceMembers.forEach(member => {
                if (team_members.includes(member.user.email)) {
                    membersToAdd.push(member.user.id);
                }
            });

            if (!membersToAdd.includes(teamLeadId)) {
                membersToAdd.push(teamLeadId);
            }

            if (membersToAdd.length > 0) {
                await prisma.projectMember.createMany({
                    data: membersToAdd.map(uid => ({
                        projectId: project.id,
                        userId: uid
                    })),
                    skipDuplicates: true
                });
            }
        }

        const projectWithMembers = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
                members: { include: { user: true } },
                tasks: { include: { assignee: true, comments: { include: { user: true } } } },
                owner: true
            }
        });

        res.json({ project: projectWithMembers, message: "Project created successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};


// update project
export const updateProject = async (req, res) => {
    try {
        const { userId } = req.auth; // REMOVED await and ()
        const { id, workspaceId, description, name, status, start_date, end_date, progress, priority } = req.body;

        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) return res.status(404).json({ message: "Project not found" });

        const workspaceMember = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: userId,
                    workspaceId: project.workspaceId
                }
            }
        });

        const isProjectLead = project.team_lead === userId;
        const isWorkspaceAdmin = workspaceMember?.role === "ADMIN";

        if (!isProjectLead && !isWorkspaceAdmin) {
            return res.status(403).json({ message: "You don't have permission to update this project" });
        }

        const updatedProject = await prisma.project.update({
            where: { id },
            data: {
                workspaceId,
                description,
                name,
                status,
                priority,
                progress: progress ? parseInt(progress) : undefined,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        });

        res.json({ project: updatedProject, message: "Project updated successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};


// add member to project
export const addMember = async (req, res) => {
    try {
        const { userId } = req.auth; // REMOVED await and ()
        const { projectId } = req.params;
        const { email } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const workspaceMember = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: userId,
                    workspaceId: project.workspaceId
                }
            }
        });

        const isProjectLead = project.team_lead === userId;
        const isWorkspaceAdmin = workspaceMember?.role === "ADMIN";

        if (!isProjectLead && !isWorkspaceAdmin) {
            return res.status(403).json({ message: "Only project lead or workspace admin can add members" });
        }

        const existingMember = project.members.find((member) => member.user.email === email);
        if (existingMember) {
            return res.status(400).json({ message: "User is already a member" });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found. Please invite them to the Workspace first." });
        }

        const member = await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId
            }
        });

        res.json({ member, message: "Member added successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};