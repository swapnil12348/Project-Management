

//create project 

import prisma from "../configs/prisma.js";

export const createProject = async (req, res) => {
    try {
        const {userId}=await req.auth();
        const {workspaceId, description, name, status, start_date, end_date, team_memebers, team_lead, progress, priority}=req.body;

        // check if user has admin role in workspacve

        const workspace = await prisma.workspace.findUnique({
            where: {id:workspaceId},
            include:{members:{include:{user:true}}}
        })

        if (!workspace) {
            return res.status(404).json({message:"Workspace not found"});    
        }

        if (!workspace.members.some((member)=>member.userId===userId && member.role === "ADMIN")) {
            return res.status(403).json({message:"you dont have permission to create projects in this workspace"});
        }
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.code || error.message });
    }
    
}


// update project

export const updateProject = async (req,res) => {
    try {
        
    } catch (error) {
        console.log (error)
        res.status(500).json({message:error.code || error.message});   
    }    
}

// add member to project

export const addMember = async (req,res) => {
    try {
        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.code || error.message});
        
    }
    
}

