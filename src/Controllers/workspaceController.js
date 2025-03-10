const { Pool } = require('pg');
const createdTables = require('../createTables/tables')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const fs = require('fs');
const path = require('path');


dotenv.config()
const pool = new Pool({
  user: process.env.user,
  host: process.env.host,
  database:process.env.database,
  password:process.env.password,
  port: process.env.port,
});



const createWorkspace = async (req, res) => {
    try {
        const { name, description, type, status, createdAt, urls,user,org_id } = req.body;

        // Get file paths from req.files
        const files = req.files.map(file => file.path); // Extract file paths

        // Ensure `urls` and `files` are properly formatted for PostgreSQL
        const filesArray = files.length > 0 ? files : null; 
        const urlsArray = urls && urls.length > 0 ? urls : null;

        const query_instance = `
            INSERT INTO workspace (lab_name, description, lab_type, date, documents, url, created_by,org_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7,$8) 
            RETURNING *`;
        
        const values = [
            name,
            description,
            type,
            createdAt,
            filesArray, 
            urlsArray,  
            user,
            org_id,
        ];

        const response = await pool.query(query_instance, values);

        if (response.rows.length === 0) {
            return res.status(400).send({
                success: false,
                message: "Workspace Creation Failed"
            });
        }

        return res.status(200).send({
            success: true,
            message: "Workspace Created Successfully",
            data: response.rows[0]
        });

    } catch (error) {
        console.error("Error in createWorkspace:", error.message);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const getWorkspaceOnUserId = async (req, res) => {
    try {
        const { id } = req.params;
        const query_instance = `SELECT * FROM workspace WHERE created_by = $1`;
        const response = await pool.query(query_instance, [id]);
        if(response.rows.length === 0) {
            return res.status(400).send({
                success: false,
                message: "Workspace not found"
            });
        }
        return res.status(200).send({
            success: true,
            message: "Workspace Found",
            data: response.rows
        });
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: error.message
    })
}
}

const getWorkspaceOnId = async (req, res) => {
    try {
        const { id } = req.params;
        const query_instance = `SELECT * FROM workspace WHERE id = $1`;
        const response = await pool.query(query_instance, [id]);
        if(response.rows.length === 0) {
            return res.status(400).send({
                success: false,
                message: "Workspace not found"
            });
        }
        return res.status(200).send({
            success: true,
            message: "Workspace Found",
            data: response.rows[0]
        });
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: error.message
    })
}
}
const editWorkspace = async(req,res)=>{
    try {
        const { id } = req.params;
        const { name, description, type, status, createdAt, urls } = req.body;
        const files = req.files.map(file => file.path); // Extract file paths

        // Ensure `urls` and `files` are properly formatted for PostgreSQL
        const filesArray = files.length > 0 ? files : null; 
        const urlsArray = urls && urls.length > 0 ? urls : null;
        const query_instance = `UPDATE workspace SET lab_name = $1, description = $2, lab_type = $3, documents = $4, url = $5 ,last_updated=$6 WHERE id = $7 RETURNING *`;
        const response = await pool.query(query_instance, [name, description, type,filesArray, urlsArray, new Date().toISOString(),id]);
        if(response.rows.length === 0) {
            return res.status(400).send({
                success: false,
                message: "Workspace not found"
            });
        }   
        return res.status(200).send({
            success: true,
            message: "Workspace Updated Successfully",
            data: response.rows[0]
        });
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: error.message
    })
}
}

const deleteFile = async (req, res) => {
    try {
        const { workspaceId, filePath } = req.body; // Get file path from request body

        if (!filePath) {
            return res.status(400).send({ message: "File path is required" });
        }

        // Resolve the absolute path to prevent directory traversal attacks
        const absolutePath = path.resolve(__dirname, '..', filePath);
        console.log(absolutePath)

        // Check if the file exists before deleting
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath); // Delete the file
            return res.status(200).send({success:true, message: "File deleted successfully" });
        } else {
            return res.status(404).json({success:false, message: "File not found" });
        }
    } catch (error) {
        console.error("Error deleting file:", error);
        return res.status(500).send({success:false, message: "Internal server error", error: error.message });
    }
};

const deleteWorkspaces = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Invalid input: IDs array is required' });
        }

        const query = `DELETE FROM workspace WHERE id = ANY($1::uuid[]) RETURNING *;`;
        const result = await pool.query(query, [ids]);

        if (result.rowCount === 0) {
            return res.status(404).send({ success:false,message: 'No workspaces found to delete' });
        }

        res.status(200).send({
            success:true,
            message: 'Workspaces deleted successfully',
            deletedRecords: result.rows
        });
    } catch (error) {
        console.error('Error deleting workspaces:', error);
        res.status(500).send({ success:true, message: 'Internal server error', error: error.message });
    }
};

const workspaceCount = async (req, res) => {
    try {
        const { org_id } = req.params;
        const query = `SELECT COUNT(*) FROM workspace WHERE org_id = $1;`;
        const result = await pool.query(query, [org_id]);

        if(result.rowCount === 0) {
            return res.status(404).send({ success:false, message: 'No workspaces found' });
        }
        const count = parseInt(result.rows[0].count);
        res.status(200).send({ success:true, message: 'Workspace count fetched successfully', data: { count } });
    } catch (error) {
        console.error('Error fetching workspace count:', error);
        res.status(500).send({ success:false, message: 'Internal server error', error: error.message });
    }
}


module.exports = {
    createWorkspace,
    getWorkspaceOnUserId,
    getWorkspaceOnId,
    editWorkspace,
    deleteFile,
    deleteWorkspaces,
    workspaceCount,
};