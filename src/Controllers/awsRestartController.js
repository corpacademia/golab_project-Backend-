const { Pool } = require('pg');
const { spawn } = require('child_process');
const dotenv = require('dotenv')
const bcrypt = require('bcrypt')
const multer = require('multer')
const fs = require('fs');
const path = require('path');
// const axios = require('axios')
// const open = require('open');

dotenv.config()
const pool = new Pool({
  user: process.env.user,
  host: process.env.host,
  database:process.env.database,
  password:process.env.password,
  port: process.env.port,
});

//Restart the instance and get the public_ip & store in database
const restartInstance=async(req,res)=>{
    const { instance_id ,user_type } = req.body;
    console.log('Restart instance')
    console.log(instance_id)
    // Run the script
    const args = [instance_id,user_type];
    const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/restartInstance.py',...args]);
    
    let result = '';
    
    // Capture the output of the Python script
    pythonProcess.stdout.on('data', (data) => {
      console.log('Output produced');
      
      // Format the script's output
      function formatOutput(output) {
        return output.replace(/\r\n/g, '\n'); // Replace \r\n with newlines
      }
    
      result += formatOutput(data.toString()); // Accumulate the script's output
      console.log(`stdout: ${data}`);
    });
    
    // Capture any errors in the script
    pythonProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    
      // Send error response to the frontend
      res.status(400).json({
        success: false,
        message: 'Error during script execution',
        details: data.toString(), // Include error details for debugging
      });
    });
    
    // Handle the process exit event
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Send success response to the frontend
        res.status(200).json({
          success: true,
          message: 'Restart Instance script executed successfully',
          result, // Include the script output
        });
      } else {
        // Send generic failure response
        res.status(500).json({
          success: false,
          message: 'Restart Instance script execution failed',
        });
      }
    });
  }

const checkIsstarted = async(req,res)=>{
    try {
        const { type, id } = req.body; // Expecting type ('lab' or 'user') and id
        console.log(req.body)
        if (!type || !id) {
            return res.status(400).json({ error: "Type and ID are required." });
        }
        
        let query;
        
        if (type === "lab") {
            query = "SELECT isstarted FROM instances WHERE instance_id = $1";
        } else if (type === "user") {
            query = "SELECT isstarted FROM cloudassignedinstance WHERE instance_id = $1";
        } else {
            return res.status(400).json({ error: "Invalid type. Use 'lab' or 'user'." });
        }
        
        const result = await pool.query(query, [id]);
        console.log(result.rows[0].isstarted)
        if (!result.rows[0] ) {
            return res.status(404).json({ message: "No record found." });
        }
        
        return res.status(200).send({ 
            success:true,
            message:"Successfull",
            isStarted: result.rows[0].isstarted 
        });
    } catch (error) {
        console.error("Error checking status:", error);
        return res.status(500).send({
            success:false,
            message:"Could not check the status",
            error
        })
    }
}

const automateInstanceVolume=async(req,res)=>{
    try {
      const { instance_id  } = req.body;
      console.log('Automate instance volume')
      console.log(instance_id)
      // Run the script 
      const args = [instance_id];
      const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/automateVolume.py',...args]);
      pythonProcess.stdout.on('data', (data) => {
        console.log('Output produced');
        function formatOutput(output) {
          return output.replace(/\r\n/g, '\n'); // Replace \r\n with newlines
        }
        result += formatOutput(data.toString()); // Accumulate the script's output
        console.log(`stdout: ${data}`);
      })
      pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        res.status(400).json({
          success: false,
          message: 'Error during script execution',
          details: data.toString(), // Include error details for debugging
        });
      })
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          res.status(200).json({
            success: true,
            message: 'Automate Instance Volume script executed successfully',
            result, // Include the script output
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Automate Instance Volume script execution failed',
          });
        }
      })
    } catch (error) {
      return res.status(500).send({success:false,message:"Could not automate the volume",error})
    }
}

  module.exports={
    restartInstance,
    checkIsstarted,
    automateInstanceVolume,
  }