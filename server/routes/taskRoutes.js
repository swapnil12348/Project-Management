import express from 'express';
import { createTask, deleteTask, updateTask } from '../controllers/taskController.js';

const taskRouter = express.Router();

// 1. Create: Matches POST /api/tasks
taskRouter.post('/', createTask);

// 2. Update: Matches PUT /api/tasks/:id
// FIX: Added ':' so req.params.id works in your controller
taskRouter.put('/:id', updateTask);

// 3. Delete: Matches DELETE /api/tasks
// FIX: Changed to DELETE method. 
// Note: Ensure your frontend sends the IDs in the request body (axios 'data' property).
taskRouter.delete('/', deleteTask);


export default taskRouter