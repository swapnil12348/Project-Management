

//create project 

export const createProject = async (req, res) => {
    try {
        
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

