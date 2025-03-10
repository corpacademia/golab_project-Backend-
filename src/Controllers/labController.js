const { Pool } = require('pg');
const { spawn } = require('child_process');
const createdTables = require('../createTables/tables')
const dotenv = require('dotenv')
const bcrypt = require('bcrypt')
const multer = require('multer')
const nodemailer = require('nodemailer')
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


const addOrganizationUser=async(req,res)=>{
    try {
        const {name,email,password,role,admin_id} = req.body;

         // Hash the password
         const hashedPassword = await bcrypt.hash(password, 10);
        const query_instance=`Insert into organization_users(name,email,password,role,admin_id) values($1,$2,$3,$4,$5) Returning *`
        const result = await pool.query(query_instance,[name,email,hashedPassword,role,admin_id])

        if(!result.rows[0]){
            return res.status(404).send({
                success:false,
                message:"Could not add the user",
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully stored the users data",
            data:result.rows[0],
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:true,
            message:"Error in database",
            error,
        })
    }
}

const getOrganizationUser=async(req,res)=>{
    try {
         const {admin_id} = req.body;
         const result = await pool.query(`select * from organization_users where admin_id=$1`,[admin_id])
        if(!result.rows){
            return res.status(404).send({
                success:false,
                message:"Could not access the user",
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully Accessed the users data",
            data:result.rows,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:true,
            message:"Error in database",
            error,
        })
    }
}

const createLab=async(req,res)=>{
    try{
       const {data,user} = req.body;
       const {type,details,platform,provider,config,instance} = data
       const query_instance=`INSERT INTO createlab (user_id,type,platform,provider,os,os_version,cpu,ram,storage,instance,title,description,duration,snapshot_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`
       const output = await pool.query(query_instance,[user.id,type,platform,provider,config.os,config.os_version,config.cpu,config.ram,config.storage,instance,details.title,details.description,details.duration,config.snapshot_type])
       if(!output.rows[0]){
        return res.status(405).send({
            success:false,
            message:"Could not store the lab catalogue",
        })
       }
       res.status(200).send({
        success:true,
        message:"Successfully stored the catalogue",
        output:output.rows[0],
       })
    }
    catch(error){
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Could not create the lab",
            error
        })
    }
}

//create new catalogue
const createNewCatalogue=async(req,res)=>{
  try{
     const {name,cpu,ram,storage,instance,snapshotType,os,os_version,platform,provider,description,duration,user} = req.body;
     const query_instance=`INSERT INTO createlab (user_id,type,platform,provider,os,os_version,cpu,ram,storage,instance,title,description,duration,snapshot_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`
     const output = await pool.query(query_instance,[user,instance,platform,provider,os,os_version,cpu,ram,storage,instance,name,description,duration,snapshotType])
     if(!output.rows[0]){
      return res.status(405).send({
          success:false,
          message:"Could not store the lab catalogue",
      })
     }
     res.status(200).send({
      success:true,
      message:"Successfully stored the catalogue",
      output:output.rows[0],
     })
  }
  catch(error){
      console.log(error)
      return res.status(500).send({
          success:false,
          message:"Could not create the lab",
          error
      })
  }
}

//delete lab from database
const deleteLab=async(req,res)=>{
  try{
     const {lab_id} = req.body;
     const query_instance = 'delete from createlab where lab_id=$1 returning * '
     const output = await pool.query(query_instance,[lab_id]);
      if(!output.rows[0]){
      return res.status(405).send({
          success:false,
          message:"Could not store the lab catalogue",
      })
     }
     res.status(200).send({
      success:true,
      message:"Successfully stored the catalogue",
      output:output.rows[0],
     })
  }
  catch(error){
      console.log(error)
      return res.status(500).send({
          success:false,
          message:"Could not create the lab",
          error
      })
  }
}

const getAllLab = async(req,res)=>{
    try{
        const query_instance = 'SELECT * FROM createlab'
        const labs = await pool.query(query_instance);
        if(!labs.rows){
            return res.status(405).send({
                success:false,
                message:"Could not get the labs"
            })
        }
        return res.status(200).send({
            success:true,
            message:'Successfully retrieved the labs',
            data:labs.rows
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Error in gettings the labs",
            error,
        })
    }
}

const getLabCatalogues = async (req, res) => {
  try {
    const query_instance = `SELECT * 
    FROM createlab l 
    INNER JOIN lab_configurations lc 
    ON l.lab_id = lc.lab_id 
    WHERE lc.config_details->>'catalogueType' = 'public'`;
    

    const result = await pool.query(query_instance);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No lab catalogues available",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Successfully accessed the lab catalogues",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching lab catalogues:", error); // Added logging for debugging
    return res.status(500).json({
      success: false,
      message: "Could not access the catalogues",
      error: error.message, // Send error message instead of full error object
    });
  }
};


const getLabsConfigured=async(req,res)=>{
    try{
        const {admin_id} = req.body;
        const query_instance =`
       SELECT cl.* 
FROM createlab cl
INNER JOIN instances ic 
ON cl.lab_id = ic.lab_id  `;


      
const labs = await pool.query(query_instance);
        if(!labs.rows){
            return res.status(404).send({
                success:false,
                message:"Could not get the labs"
            })
        }
        return res.status(200).send({
            success:true,
            message:'Successfully retrieved the labs',
            data:labs.rows
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Error in gettings the labs",
            error,
        })
    }
}

const getLabOnId = async(req,res)=>{
    try{
        const {labId} = req.body;
        const query_instance =`SELECT * from createlab where lab_id=$1`
        const result = await pool.query(query_instance,[labId]);

        if (!result || !result.rows || result.rows.length === 0) {
          return res.status(404).send({
            success: false,
            message: "No lab found for the provided labId",
          });
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed lab catalogue",
            data:result.rows[0],
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Error in getting the lab",
            error,
        })
    }
}

const getAssignLabOnLabId = async(req,res)=>{
    try{
         const {labId,userId} = req.body;
        const query_instance =`SELECT * from labassignments where lab_id=$1 and user_id=$2`
        const result = await pool.query(query_instance,[labId,userId]);

        if(!result.rows[0]){
            return res.status(405).send({
                success:false,
                message:"Invalid lab id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed lab assigned",
            data:result.rows[0],
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Error in getting the lab",
            error,
        })
    }
}


const assignLab = async (req, res) => {
  try {
      const { lab, userId, assign_admin_id } = req.body;
      // Normalize `userId` to an array for consistent handling
      const userIds = Array.isArray(userId) ? userId : [userId];
      const getDays = await pool.query(`SELECT config_details FROM lab_batch WHERE lab_id=$1 and admin_id=$2`, [lab,assign_admin_id]);
      if (!getDays.rows.length) {
          return res.status(400).send({
              success: false,
              message: "Invalid lab ID",
          });
      }

      let date = new Date();
      date.setDate(date.getDate() + getDays.rows[0].config_details.numberOfDays);
      let completion_date = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD

      // Arrays to track successful assignments and errors
      const successfulAssignments = [];
      const errors = [];

      for (const user of userIds) {
          const checkAlreadyAssigned = await pool.query(
              `SELECT * FROM labassignments WHERE user_id=$1 AND lab_id=$2`,
              [user, lab]
          );

          if (checkAlreadyAssigned.rows.length > 0) {
              if (userIds.length === 1) {
                  // If there's only one user and the lab is already assigned, return immediately
                  return res.status(400).send({
                      success: false,
                      message: "Lab already assigned to the user",
                      user_id: user,
                      lab_id: lab,
                  });
              } else {
                  // For multiple users, add the error and continue
                  errors.push({
                      user_id: user,
                      lab_id: lab,
                      message: "Lab already assigned to the user",
                  });
                  continue;
              }
          }

          // Insert lab assignment into the database
          const query_instance = `
              INSERT INTO labassignments (lab_id, user_id, completion_date, status, assigned_admin_id) 
              VALUES ($1, $2, $3, $4, $5) 
              RETURNING *`;

          const result = await pool.query(query_instance, [
              lab,
              user,
              completion_date,
              "pending",
              assign_admin_id,
          ]);

          if (result.rows.length > 0) {
              successfulAssignments.push(result.rows[0]);
          } else {
              errors.push({
                  user_id: user,
                  lab_id: lab,
                  message: "Failed to assign the lab",
              });
          }
      }

      // Return the results
      return res.status(200).send({
          success: true,
          message: "Lab assignments processed",
          successfulAssignments,
          errors, // Include errors for reference
      });

  } catch (error) {
      console.error(error);
      return res.status(500).send({
          success: false,
          message: "Error in assigning the labs",
          error: error.message,
      });
  }
};

const getAssignLabOnId = async(req,res)=>{
    try {
        const {userId} = req.body;
        const query_instance = `SELECT * FROM labassignments WHERE user_id=$1`
        const result = await pool.query (query_instance,[userId])
        if(!result.rows){
            return res.status(404).send({
                success:false,
                message:"Error in retrieving the labs",
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the labs",
            data:result.rows,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Server error",
            error,
        })
    }
}
const ec2Terraform =  async(req,res)=>{


    const {cloudPlatform} = req.body
    //run the script
        const pythonProcess = spawn('python', ['EC2.py']);
      
        let result = '';
      
        // Capture the output of the Python script
        pythonProcess.stdout.on('data', (data) => {
          console.log('output produced')
          function formatOutput(output) {
            // Replace \r\n with actual newlines
            const formattedOutput = output.replace(/\r\n/g, '\n');
            return formattedOutput;
        }
          result += formatOutput(data.toString()); // Accumulate the script's output
          console.log(`stdout: ${data}`);
        });
      
        pythonProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
        });
      
        pythonProcess.on('close', (code) => {
          console.log(`${cloudPlatform} process exited with code ${code}`);
          
        if (code === 0) {
          return res.status(200).json({
              success: true,
              message: 'Python script executed successfully',
              result: result.trim(),
          });
      } else {
          return res.status(500).json({
              success: false,
              message: 'Python script execution failed',
              error: errorResult.trim(),
          });
      }
        });
      
        
    
      //  Set a timeout for the process (e.g., 30 seconds)
    //    setTimeout(() => {
    //     pythonProcess.kill();
    //     res.status(500).send({ error: 'Python script execution timed out.' });
    // }, 30000); 
    
    }

const runTf = async(req,res)=>{
    const { lab_id } = req.body;
    console.log('tf')
    // Run the script
    const args = [lab_id];
    const pythonProcess = spawn('python', ['terra.py',...args]);
    
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
      return res.status(400).json({
        success: false,
        message: 'Error during script execution',
        details: data.toString(), // Include error details for debugging
      });
    });
    
    // Handle the process exit event
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Send success response to the frontend
       return  res.status(200).json({
          success: true,
          message: 'Python script executed successfully',
          result, // Include the script output
        });
      } else {
        // Send generic failure response
        return res.status(500).json({
          success: false,
          message: 'Python script execution failed',
        });
      }
    });
}

const instanceToData = async(req,res)=>{
    const {lab_id} = req.body
    console.log('instanceToData')
    //run the script
    const args = [lab_id];
    const pythonProcess = spawn('python', ['instanceToData.py', ...args]);
      
    let result = '';
  
    // Capture the output of the Python script
    pythonProcess.stdout.on('data', (data) => {
      console.log('output produced')
      function formatOutput(output) {
        // Replace \r\n with actual newlines
        const formattedOutput = output.replace(/\r\n/g, '\n');
        return formattedOutput;
    }
      result += formatOutput(data.toString()); // Accumulate the script's output
      console.log(`stdout: ${data}`);
    });
  
    pythonProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
  
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Send the accumulated result once the process exits
        res.json({ message: 'Python script executed successfully', result });
      } else {
        res.status(500).json({ error: 'Python script execution failed' });
      }
    });
}


const getInstanceOnParameters = async(req,res)=>{
    try {
        const {cloud,cpu,ram,storage} = req.body;
        let table;
        switch (cloud.toLowerCase()) {
            case 'aws':
                table = 'ec2_instance'; // Path to the AWS-specific script
                break;
            case 'azure':
                table = 'azure_vm'; // Path to the Azure-specific script
                break;
            default:
                return res.status(400).json({ error: 'Unsupported cloud platform' });
        }

        const core = cpu.toString()
        const memory = ram.toString()
        const query_instance = `SELECT * FROM ${table} WHERE vcpu=$1 AND memory=$2`
        const result = await pool.query(query_instance,[core,memory])

        if(!result.rows){
            return res.status(404).send({
                success:true,
                message:"Could get the data"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the data",
            result:result.rows
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Error in getting the instances",
            error,
        })
    }
}
const getInstanceDetailsForPricing = async(req,res)=>{
    try {
        let {provider,instance,cpu,ram} = req.body;
        let table,instancename;
        switch(provider.toLowerCase()){
            case 'aws':
                table='ec2_instance'
                instancename='instanceName'
                break
            case 'azure':
                table='azure_vm'
                instancename='instance'
                break
        }
        const query_instance = `
    SELECT * 
    FROM ${table} 
    WHERE REPLACE(${instancename}, E'\n', '') = $1 
    AND vcpu = $2
      AND memory = $3
      
`;

        const result = await pool.query(query_instance,[instance,cpu,ram])
        
        if(!result.rows[0]){
            return res.status(404).send({
                success:false,
                message:"No data with the details"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully Accessed the details",
            data:result.rows[0]
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Error in accessing the data",
            error,
        })
    }
}
const updateLabsOnConfig=async(req,res)=>{
    try {
        const {lab_id,admin_id,catalog_name,config_details} = req.body;
        const query_instance = `Insert into lab_configurations (lab_id,admin_id,config_details) VALUES($1,$2,$3) RETURNING *`;
        const result = await pool.query(query_instance,[lab_id,admin_id,config_details])
        if(!result.rows[0]){
            return res.status(404).send({
                success:false,
                message:"Invalid Details for updating lab"
            })
        }
        return res.status(201).send({
            success:true,
            message:"Successfully updated the lab configured",
            data:result.rows[0]
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Could not update the lab config",
            error,
        })
    }
}

const awsConfigure=async(req,res)=>{
    try {
        const {lab_id} = req.body;
        const query_instance = 'select * from amiinformation where lab_id=$1';
        const response = await pool.query(query_instance,[lab_id]);
        if(!response.rows[0]){
            return res.status(404).send({
                success:true,
                message:"Invalid lab id",
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed ami information",
            result:response.rows[0],
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Error from accessing ami information",
            error,
        })
    }
}

// const vmToGoldenImage=async(req,res)=>{
//     const { instance_id ,lab_id } = req.body;
//     console.log('vm-gold')
//     // Run the script
//     const args = [instance_id,lab_id];
//     const pythonProcess = spawn('python', ['vm_goldenImage.py',...args]);
    
//     let result = '';
    
//     // Capture the output of the Python script
//     pythonProcess.stdout.on('data', (data) => {
//       console.log('Output produced');
      
//       // Format the script's output
//       function formatOutput(output) {
//         return output.replace(/\r\n/g, '\n'); // Replace \r\n with newlines
//       }
    
//       result += formatOutput(data.toString()); // Accumulate the script's output
//       console.log(`stdout: ${data}`);
//     });
    
//     // Capture any errors in the script
//     pythonProcess.stderr.on('data', (data) => {
//       console.error(`stderr: ${data}`);
    
//       // Send error response to the frontend
//       res.status(400).json({
//         success: false,
//         message: 'Error during script execution',
//         details: data.toString(), // Include error details for debugging
//       });
//     });
    
//     // Handle the process exit event
//     pythonProcess.on('close', (code) => {
//       if (code === 0) {
//         // Send success response to the frontend
//         res.status(200).json({
//           success: true,
//           message: 'VmToGoldenImage script executed successfully',
//           result, // Include the script output
//         });
//       } else {
//         // Send generic failure response
//         res.status(500).json({
//           success: false,
//           message: 'VmToGoldenImage script execution failed',
//         });
//       }
//     });
// }

const vmToGoldenImage = async (req, res) => {
  const { instance_id, lab_id } = req.body;
  console.log(" vmToGoldenImage started...");

  const pythonProcess = spawn("python", ["vm_goldenImage.py", instance_id, lab_id]);

  let result = "";
  let errorOutput = "";

  // Capture standard output (stdout)
  pythonProcess.stdout.on("data", (data) => {
      result += data.toString(); // Accumulate script's output
      console.log(`🟢 stdout: ${data.toString()}`);
  });

  // Capture errors (stderr)
  pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error(` stderr: ${data.toString()}`);
  });

  // Handle script completion
  pythonProcess.on("close", (code) => {
      console.log(` Process exited with code ${code}`);

      try {
          if (code === 0) {
              // Parse JSON output from Python
              const parsedResult = JSON.parse(result);
              return res.status(200).send({
                  success: true,
                  message: "VmToGoldenImage script executed successfully",
                  data: parsedResult, // Send parsed JSON
              });
          } else {
              return res.status(500).send({
                  success: false,
                  message: "VmToGoldenImage script execution failed",
                  error: errorOutput.trim() || "Unknown error",
              });
          }
      } catch (parseError) {
          return res.status(500).send({
              success: false,
              message: "Failed to parse Python script output",
              rawOutput: result,
              error: parseError.message,
          });
      }
  });
};

const goldenToInstance = async (req,res)=>{
    const {instance_type, ami_id ,no_instance,termination_period } = req.body;
    console.log('gold-in')
    // Run the script
    const args = [instance_type,ami_id,no_instance,termination_period];
    const pythonProcess = spawn('python', ['golden_instance.py',...args]);
    
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
          message: 'GoldenImageToInstance script executed successfully',
          result, // Include the script output
        });
      } else {
        // Send generic failure response
        res.status(500).json({
          success: false,
          message: 'GoldenImageToInstance script execution failed',
        });
      }
    });
}

//create an instance from goldenImage(new catalogue) 
const goldenToInstanceForNewCatalogue = async (req,res)=>{
  const {instance_type, ami_id ,storage_size,lab_id,prev_labId } = req.body;
  console.log('NewCatalogue')
  // Run the script
  const args = [instance_type,ami_id,storage_size,lab_id,prev_labId];
  const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/goldenToInstanceForNewCatalogue.py',...args]);
  
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
        message: 'GoldenImageToInstance script executed successfully',
        result, // Include the script output
      });
    } else {
      // Send generic failure response
      res.status(500).json({
        success: false,
        message: 'GoldenImageToInstance script execution failed',
      });
    }
  });
}

const getAwsInstanceDetails=async(req,res)=>{
    try {
        const {lab_id} = req.body;
        const query_instance = `select * from instances where lab_id=$1`
        const response = await pool.query(query_instance,[lab_id])
        if(!response.rows[0]){
            return res.status(404).send({
                success:false,
                message:"Invalid lab id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed instanceDetails",
            result:response.rows[0],
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Could not access the aws instance details",
            error,
        })
    }
}

const getAwsInstanceDetailsOfUsers=async(req,res)=>{
  try {
      const {lab_id,user_id} = req.body;
      const query_instance = `select * from cloudassignedinstance where lab_id=$1 and user_id=$2`
      const response = await pool.query(query_instance,[lab_id,user_id])
      if(!response.rows[0]){
          return res.status(404).send({
              success:false,
              message:"Invalie lab id"
          })
      }
      return res.status(200).send({
          success:true,
          message:"Successfully accessed instanceDetails",
          result:response.rows[0],
      })
  } catch (error) {
      console.log(error)
      return res.status(500).send({
          success:false,
          message:"Could not access the aws instance details",
          error,
      })
  }
}
//update running state of usersinstance
const updatetAwsInstanceDetailsOfUsers=async(req,res)=>{
  try {
      const {lab_id,user_id,state} = req.body;
      console.log(lab_id)
      const query_instance = `update cloudassignedinstance set isRunning=$1  where lab_id=$2 and user_id=$3 RETURNING *`
      const response = await pool.query(query_instance,[state,lab_id,user_id])
      if(!response.rows[0]){
          return res.status(404).send({
              success:false,
              message:"Invalie lab id"
          })
      }
      return res.status(200).send({
          success:true,
          message:"Successfully accessed instanceDetails",
          result:response.rows[0],
      })
  } catch (error) {
      console.log(error)
      return res.status(500).send({
          success:false,
          message:"Could not access the aws instance details",
          error,
      })
  }
}

//update the running state of lab instance
const updatetAwsLabInstanceDetails=async(req,res)=>{
  try {
      const {lab_id,state} = req.body;
      console.log(req.body)
      const query_instance = `update instances set isRunning=$1  where lab_id=$2  RETURNING *`
      const response = await pool.query(query_instance,[state,lab_id])
      if(!response.rows[0]){
          return res.status(404).send({
              success:false,
              message:"Invalie lab id"
          })
      }
      return res.status(200).send({
          success:true,
          message:"Successfully accessed instanceDetails",
          result:response.rows[0],
      })
  } catch (error) {
      console.log(error)
      return res.status(500).send({
          success:false,
          message:"Could not access the aws instance details",
          error,
      })
  }
}

const organizations = async(req,res)=>{
    try {
        const data = await pool.query(`select * from organizations`)

        if(!data.rows){
            return res.status(404).send({
                success:false,
                message:"No data available for organizations"
            })
        }
        return res.status(200).send({
            success:true,
            message:"organization list accessed successfully",
            data:data.rows
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Error in the database",
            error,
        })
    }
}

const organizations_parameter = async(req,res)=>{
    try {
        const {org_id} = req.body;
        const data = await pool.query(`select * from organizations  where id=$1`,[org_id])

        if(!data.rows[0]){
            return res.status(404).send({
                success:false,
                message:"No data available for organization"
            })
        }
        return res.status(200).send({
            success:true,
            message:"organization  accessed successfully",
            data:data.rows[0]
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Error in the database",
            error,
        })
    }
}

const amiInformation = async(req,res)=>{
    try {
        const {lab_id} = req.body;
        const data = await pool.query(`select * from amiinformation where lab_id=$1`,[lab_id])
        if(!data.rows[0]){
            return res.status(404).send({
                success:false,
                message:"No data available for the instance"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Ami information accessed successfully",
            data:data.rows[0]
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Error in the database",
            error,
        })
    }
}

const insertUsers = async(req,res)=>{
    try {
        const {users,organization,admin_id,organization_type} = req.body;
        const query_instance = `insert into users (email,password,organization,created_by,organization_type) values($1,$2,$3,$4,$5)`

        for (const user of users) {
            // Hash the password
            const hashedPassword = await bcrypt.hash(user.password, 10);
        
            // Insert into the database
            await pool.query(query_instance, [
              user.userId,
              hashedPassword,
              organization,
              admin_id,
              organization_type,
            ]);
          }
        return res.status(201).send({
            success:true,
            message:"Successfully inserted users",
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Could not store users",
            error,
        })
    }
}

const lab_batch = async (req, res) => {
  try {
      const { lab_id, admin_id, org_id, config_details, configured_by, software } = req.body;
      // Check if the record already exists
      const check_query = `SELECT * FROM lab_batch WHERE lab_id = $1 AND admin_id = $2 AND org_id = $3`;
      const existingRecord = await pool.query(check_query, [lab_id, admin_id, org_id]);

      if (existingRecord.rows.length > 0) {
          return res.status(200).send({
              success: false,
              message: "Already assigned to the organization",
              data: existingRecord.rows[0],
          });
      }

      // Insert new record
      const query_instance = `INSERT INTO lab_batch(lab_id, admin_id, org_id, config_details, configured_by, software) 
                              VALUES($1, $2, $3, $4, $5, $6) RETURNING *`;

      const batch = await pool.query(query_instance, [lab_id, admin_id, org_id, config_details, configured_by, software]);

      return res.status(200).send({
          success: true,
          message: "Successfully stored the data",
          data: batch.rows[0],
      });

  } catch (error) {
      console.error("Error in lab_batch:", error);
      return res.status(500).send({
          success: false,
          message: "Error in server",
          error: error.message,
      });
  }
};

const getLabBatchAssessment =async(req,res)=>{
    try {
        const {admin_id}=req.body;
        const data  = await pool.query('Select * from lab_batch where admin_id=$1',[admin_id])

        if(!data.rows){
            return res.status(404).send({
                success:false,
                message:"Invalid details"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed",
            data:data.rows,
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Server error",
            error,
        })
    }
}

//get the software details to users card based on labid
const getSofwareDetails =async(req,res)=>{
  try {
      const data  = await pool.query('Select * from lab_batch ')

      if(!data.rows){
          return res.status(404).send({
              success:false,
              message:"Invalid details"
          })
      }
      return res.status(200).send({
          success:true,
          message:"Successfully accessed",
          data:data.rows,
      })
  } catch (error) {
      return res.status(500).send({
          success:false,
          message:"Server error",
          error,
      })
  }
}

 //check the lab is assigned to the organization
 const checkLabBatchAssessment =async(req,res)=>{
    try {
        const {admin_id,org_id}=req.body;
        const data  = await pool.query('Select * from lab_batch where admin_id=$1 and org_id=$2',[admin_id,org_id])

        if(!data.rows){
            return res.status(404).send({
                success:false,
                message:"Invalid details"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed",
            data:data.rows,
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Server error",
            error,
        })
    }
}


 const sendEmail = async (req, res) => {
      try {
        console.log('email started')
        const { email, subject, body } = req.body;
        if (!req.file) {
          return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }
    
        const filePath = path.resolve(req.file.path); // Path to the uploaded file
        const fileContent = fs.readFileSync(filePath); // Read the file from the disk
    
        const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: 'parveezkhan9611@gmail.com',
            pass: 'pbxk hscp lgnz fmyr',
          },
        });
    
        const mailOptions = {
          from: 'parveezkhan9611@gmail.com',
          to: email,
          subject: subject || 'User Credentials PDF',
          text: body || 'Please find the attached User Credentials.',
          attachments: [
            {
              filename: req.file.originalname,
              content: fileContent, // Correct binary content
              contentType: req.file.mimetype, // Ensure proper MIME type
            },
          ],
        };
    
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent successfully with PDF attachment!' });
      } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send email.' });
      }
    };
    
    //delete vm from superadmin
    const deleteVm = async (req, res) => {
        try {

            //run the deleteinstance.py script 
            const executePythonScript = (scriptPath, args) => {
                return new Promise((resolve, reject) => {
                  const pythonProcess = spawn('python', [scriptPath, ...args]);
              
                  let result = '';
                  let errorOutput = '';
              
                  // Capture stdout
                  pythonProcess.stdout.on('data', (data) => {
                    result += data.toString();
                  });
              
                  // Capture stderr
                  pythonProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.log(errorOutput)
                  });
              
                  // Handle process exit
                  pythonProcess.on('close', (code) => {
                    if (code === 0) {
                      resolve(result); // Successfully executed script
                    } else {
                      reject(`Delete vm exited with code ${code}. Error: ${errorOutput}`);
                    }
                  });
              
                  // Handle unexpected errors
                  pythonProcess.on('error', (err) => {
                    reject(`Error starting DeleteVm process: ${err.message}`);
                  });
                });
              };

            
            const { id ,instance_id, ami_id ,user_id} = req.body;
            console.log(req.body)
            if (!id ) {
                return res.status(400).send({
                    success: false,
                    message: "Lab ID is required",
                });
            }
            
            
            //execute above delete function in cloud
             // Arguments for the Python script
             const scriptPath = './python_scripts.py/cloudvms/deleteInstance.py';
             const args = [instance_id,ami_id]; 

            // Execute the Python script
            const scriptOutput = await executePythonScript(scriptPath, args);

            // Perform delete operations in multiple tables
            // await pool.query(`DELETE FROM amiinformation WHERE lab_id = $1`, [id]);
            // await pool.query(`DELETE FROM instances WHERE lab_id = $1`, [id]);
            // await pool.query(`DELETE FROM lab_configurations WHERE lab_id = $1`, [id]);
            // await pool.query(`DELETE FROM lab_batch WHERE lab_id = $1`, [id]);
            await pool.query(`DELETE FROM labassignments WHERE lab_id = $1 and user_id=$2`, [id,user_id]);
            await pool.query(`DELETE FROM cloudassignedinstance WHERE lab_id = $1 and user_id=$2`, [id,user_id])
            // await pool.query(`DELETE FROM createlab WHERE lab_id = $1`, [id]);

    
            // Return success response
            return res.status(200).send({
                success: true,
                message: "Lab deleted successfully",
            });
        } catch (error) {
            // Return error response
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Error deleting lab from the database",
                error: error.message,
            });
        }
    };

     //delete vm from superadmin
     const deleteSuperVm = async (req, res) => {
        try {

            //run the deleteinstance.py script 
            const executePythonScript = (scriptPath, args) => {
                return new Promise((resolve, reject) => {
                  const pythonProcess = spawn('python', [scriptPath, ...args]);
              
                  let result = '';
                  let errorOutput = '';
              
                  // Capture stdout
                  pythonProcess.stdout.on('data', (data) => {
                    result += data.toString();
                  });
              
                  // Capture stderr
                  pythonProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.log(errorOutput)
                  });
              
                  // Handle process exit
                  pythonProcess.on('close', (code) => {
                    if (code === 0) {
                      resolve(result); // Successfully executed script
                    } else {
                      reject(`Delete vm exited with code ${code}. Error: ${errorOutput}`);
                    }
                  });
              
                  // Handle unexpected errors
                  pythonProcess.on('error', (err) => {
                    reject(`Error starting DeleteVm process: ${err.message}`);
                  });
                });
              };

            
            const { id ,instance_id, ami_id } = req.body;
            if (!id ) {
                return res.status(400).send({
                    success: false,
                    message: "Lab ID is required",
                });
            }
            
            
            //execute above delete function in cloud
             // Arguments for the Python script
             const scriptPath = './python_scripts.py/cloudvms/deleteInstance.py';
             const args = [instance_id,ami_id]; 

            // Execute the Python script
            const scriptOutput = await executePythonScript(scriptPath, args);

            // Perform delete operations in multiple tables
            await pool.query(`DELETE FROM amiinformation WHERE lab_id = $1`, [id]);
            await pool.query(`DELETE FROM instances WHERE lab_id = $1`, [id]);
            await pool.query(`DELETE FROM lab_configurations WHERE lab_id = $1`, [id]);
            await pool.query(`DELETE FROM lab_batch WHERE lab_id = $1`, [id]);
            await pool.query(`DELETE FROM labassignments WHERE lab_id = $1 `, [id]);
            await pool.query(`DELETE FROM createlab WHERE lab_id = $1`, [id]);

    
            // Return success response
            return res.status(200).send({
                success: true,
                message: "Lab deleted successfully",
            });
        } catch (error) {
            // Return error response
            console.log(error)
            return res.status(500).send({
                success: false,
                message: "Error deleting lab from the database",
                error: error.message,
            });
        }
    };

 //delete cloud vms from organnization admin
 const deleteOrgAssignedCloudVms = async (req, res) => {
    try {
        
        const { lab_id , admin_id } = req.body;

        if (!lab_id || !admin_id) {
            return res.status(400).send({
                success: false,
                message: "Invalid details",
            });
        }

        // Perform delete operations in multiple tables
        await pool.query(`DELETE FROM labassignments WHERE assigned_admin_id = $1`, [admin_id]);
        await pool.query(`DELETE FROM lab_batch WHERE lab_id = $1`, [lab_id]);
        

        // Return success response
        return res.status(200).send({
            success: true,
            message: "Lab deleted successfully",
        });
    } catch (error) {
        // Return error response
        console.log(error)
        return res.status(500).send({
            success: false,
            message: "Error deleting lab from the database",
            error: error.message,
        });
    }
};

const handleLaunchSoftwareOrStop = async (req, res) => {
    try {
        const {os_name,instance_id,hostname,password} = req.body;
        console.log(req.body)
        const scriptPath = path.resolve('C:/Users/Shilpa/Desktop/app.golabing - Copy/project/Backend/src/Controllers/jwttoken.py');

        const executeJWTScript = () => {
            return new Promise((resolve, reject) => {
                const args=[os_name,instance_id,hostname,password]
                const process = spawn('python', [scriptPath,...args]);

                let output = '';
                let errorOutput = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(output.trim());
                    } else {
                        reject(`JWT script failed with code ${code}: ${errorOutput}`);
                    }
                });

                process.on('error', (err) => {
                    reject(`Failed to start JWT script: ${err.message}`);
                });
            });
        };

        // Get the JWT token
        const jwtToken = await executeJWTScript();
        console.log("Generated JWT Token:", jwtToken);
        return res.send({
            success: true,
            message: "Connected to Guacamole and opened in browser",
            jwtToken: jwtToken,
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({
            success: false,
            message: "Could not Launch or Stop software",
            error: error.message,
        });
    }
};

const getOperatingSystemsFromDataBase = async(req,res)=>{
    try {
        const result = await pool.query( 'select * from operating_systems');

        if(!result.rows){
            return res.status(404).send({
                success:false,
                message:"Could not get the operating systems"
            })
        }
        return res.status(201).send({
            success:true,
            message:"Successfully accessed the operating systems list",
            data:result.rows
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Error in database for getting operating system list",
            error,
        })
    }
}

const getDecryptPasswordFromCloud=async(req,res)=>{
    try {
        console.log('decrypt password')
        console.log(req.body)
        const{lab_id,public_ip,instance_id} = req.body;
      const args =[lab_id,public_ip,instance_id]
        const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/decrypt_password.py',...args]);
        
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
              message: 'Decrypt Password script executed successfully',
              result, // Include the script output
            });
          } else {
            // Send generic failure response
            res.status(500).json({
              success: false,
              message: 'Decrypt Password script execution failed',
            });
          }
        });
    } catch (error) {
      console.log(error)
        return res.status(500).send({
            success:false,
            message:"Error",
            error,
        })
    }
}

//get the new public_ip from cloud on restart
const getNewIpFromCloud=async(req,res)=>{
  try {
      console.log('get public ip')
      const{instance_id} = req.body;
    const args =[instance_id]
      const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/generateNewIp.py',...args]);
      
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
            message: 'Get public ip script executed successfully',
            result, // Include the script output
          });
        } else {
          // Send generic failure response
          res.status(500).json({
            success: false,
            message: 'Get public ip script execution failed',
          })
        }
      });
  } catch (error) {
    console.log(error)
      return res.status(500).send({
          success:false,
          message:"Error",
          error,
      })
  }
}

//user decrypt password
const getUserDecryptPasswordFromCloud=async(req,res)=>{
  try {
      console.log('decrypt password')
      const{user_id,public_ip,instance_id} = req.body;
      console.log(req.body)
      const args =[user_id,public_ip,instance_id]
      const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/userDecryptPassword.py',...args]);
      
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
        return res.status(400).json({
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
            message: 'Decrypt Password script executed successfully',
            result, // Include the script output
          });
        } else {
          // Send generic failure response
          return res.status(500).json({
            success: false,
            message: 'Decrypt Password script execution failed',
          });
        }
      });
  } catch (error) {
    console.log(error)
      return res.status(500).send({
          success:false,
          message:"Error",
          error,
      })
  }
}



const updateAssessmentStorage=async(req,res)=>{
    try {
        console.log('edit instance')
        const {new_volume_size,instance_id,lab_id}=req.body;
        const args = [instance_id,new_volume_size]
        const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/editinstance.py', instance_id, new_volume_size]);

        
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
          return res.status(400).json({
            success: false,
            message: 'Error during script execution',
            details: data.toString(), // Include error details for debugging
          });
        });
        
        // Handle the process exit event
        pythonProcess.on('close', async (code) => {
          if (code === 0) {
            //update in the database
           await pool.query('UPDATE createlab SET storage = $1 WHERE lab_id = $2', [new_volume_size, lab_id]);
            // Send success response to the frontend
            res.status(200).json({
              success: true,
              message: 'Edit instance script executed successfully',
              result, // Include the script output
            });
          } else {
            // Send generic failure response
            return res.status(500).json({
              success: false,
              message: 'Edit instance script execution failed',
            });
          }
        });
  } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Error",
            error,
        })
    }
}


const createCloudAssignedInstance = async (req, res) => {
    try {
        console.log("Launching instance...");
        console.log(req.body)

        const { name, ami_id, user_id, lab_id, instance_type, start_date, end_date } = req.body;

        // Validate required fields
        if (!name || !ami_id || !user_id || !lab_id || !instance_type || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters",
            });
        }

        const args = [name, ami_id, user_id, lab_id, instance_type, start_date, end_date];
        const scriptPath = "./python_scripts.py/cloudvms/launchInstance.py"; // Ensure correct path

        const pythonProcess = spawn("python", [scriptPath, ...args]);
        let result = "";
        let errorMessage = "";

        pythonProcess.stdout.on("data", (data) => {
            result += data.toString();
            console.log(`stdout: ${data.toString()}`);
        });

        pythonProcess.stderr.on("data", (data) => {
            errorMessage += data.toString();
            console.error(`stderr: ${data.toString()}`);
        });

        pythonProcess.on("error", (error) => {
            console.error("Failed to start Python script:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to execute Python script",
                error: error.message,
            });
        });

        pythonProcess.on("close", (code) => {
            if (code === 0) {
                res.status(200).json({
                    success: true,
                    message: "Launch instance script executed successfully",
                    result: result.trim(),
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: "Launch instance script execution failed",
                    error: errorMessage.trim() || "Unknown error occurred",
                });
            }
        });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error executing Python script",
            error: error.message,
        });
    }
};





const ConnectCorpAwsAccount=async(req,res)=>{
    try {
        console.log('Aws Corp Accounr')
        const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/corpaws_acc.py']);

        
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
              message: 'Corp Aws script executed successfully',
              result, // Include the script output
            });
          } else {
            // Send generic failure response
            res.status(500).json({
              success: false,
              message: 'Corp Aws script execution failed',
            });
          }
        });
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Error",
            error,
        })
    }
}

const ConnectOrgAws=async(req,res)=>{
    try {
        console.log('Aws Org Accounr')
        const {aws_access_key,aws_secret_key} = req.body;
        const args = [aws_access_key,aws_secret_key]
        const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/orgaws_acc.py',...args]);

        
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
              message: 'Corp Aws script executed successfully',
              result, // Include the script output
            });
          } else {
            // Send generic failure response
            res.status(500).json({
              success: false,
              message: 'Corp Aws script execution failed',
            });
          }
        });
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Error",
            error,
        })
    }
}
const startLab=async(req,res)=>{
    try {
        console.log('Start Lab')
        const {aws_access_key,aws_secret_key} = req.body;
        const args = [aws_access_key,aws_secret_key]
        const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/orgaws_acc.py',...args]);

        
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
              message: 'Start Lab script executed successfully',
              result, // Include the script output
            });
          } else {
            // Send generic failure response
            res.status(500).json({
              success: false,
              message: 'Start Lab script execution failed',
            });
          }
        });
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Error",
            error,
        })
    }
}

const stopLab=async(req,res)=>{
    try {
        console.log('stop Lab')
        const {aws_access_key,aws_secret_key} = req.body;
        const args = [aws_access_key,aws_secret_key]
        const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/orgaws_acc.py',...args]);

        
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
              message: 'Stop Lab script executed successfully',
              result, // Include the script output
            });
          } else {
            // Send generic failure response
            res.status(500).json({
              success: false,
              message: 'Stop Lab script execution failed',
            });
          }
        });
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Error",
            error,
        })
    }
}

const getCloudAssignedInstance=async(req,res)=>{
    try {
        const {user_id,lab_id} = req.body;
        const query_instance = 'select * from cloudAssignedInstance where user_id=$1 and lab_id=$2'
        const response = await pool.query(query_instance,[user_id,lab_id])

        if(!response.rows[0]){
            return res.status(404).send({
                success:true,
                message:"Invalid credentials"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed",
            data:response.rows[0]
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Error in database",
            error
        })
    }
}

//check the whether the user vm is launched
const checkCloudAssignedInstanceLaunched=async(req,res)=>{
  try {
      const {lab_id,user_id} = req.body;
      const query_instance = 'select * from cloudAssignedInstance where lab_id=$1 and user_id=$2'
      const response = await pool.query(query_instance,[lab_id,user_id])

      if(!response.rows[0]){
          return res.status(404).send({
              success:false,
              message:"Invalid credentials"
          })
      }
      return res.status(200).send({
          success:true,
          message:"Successfully accessed",
          data:response.rows[0]
      })
  } catch (error) {
      return res.status(500).send({
          success:false,
          message:"Error in database",
          error
      })
  }
}

//check whether the lab vm is launched
const checkLabCloudInstanceLaunched=async(req,res)=>{
  try {
      const {lab_id} = req.body;
      const query_instance = 'select * from instances where lab_id=$1 '
      const response = await pool.query(query_instance,[lab_id])

      if(!response.rows[0]){
          return res.status(404).send({
              success:false,
              message:"Invalid credentials"
          })
      }
      return res.status(200).send({
          success:true,
          message:"Successfully accessed",
          data:response.rows[0]
      })
  } catch (error) {
      return res.status(500).send({
          success:false,
          message:"Error in database",
          error
      })
  }
}

 //stop instance
 const stopInstance=async(req,res)=>{
  const { instance_id  } = req.body;
  console.log(instance_id)
  console.log('stop-instance')
  // Run the script
  const args = [instance_id];
  const pythonProcess = spawn('python', ['./python_scripts.py/cloudvms/stopInstance.py',...args]);
  
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
        message: 'Stop Instance script executed successfully',
        result, // Include the script output
      });
    } else {
      // Send generic failure response
      res.status(500).json({
        success: false,
        message: 'Stop Instance script execution failed',
      });
    }
  });
}

//create a organization 
const createOrganization = async (req, res) => {
  try {
    const { organization_name, admin_name,email,phone,address,website,org_type,org_id,admin_id} = req.body;
    const logoPath = req.file.path
    const query_instance = 'insert into organizations(organization_name,org_email,org_admin,org_type,admin_name,phone_number,address,website_url,org_id,logo) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *'
    const response
     = await pool.query(query_instance,[organization_name,email,admin_id ,org_type,admin_name,phone,address,website,org_id,logoPath])      
    if(!response.rows.length){
        return res.status(404).send({
            success:false,
            message:"Invalid credentials"
        })                
  } 
  return res.status(200).send({ 
    success:true,
    message:"Successfully accessed",
    data:response.rows[0]
})    
}
  catch (error) {
    console.log(error)
    return res.status(500).send({
      success:false,
      message:"Error in server",
      error:error.message
    }
    )
  }
}

module.exports = {
    createLab,
    getAllLab,
    getLabOnId,
    assignLab,
    getAssignLabOnId,
    ec2Terraform,
    getInstanceOnParameters,
    getInstanceDetailsForPricing,
    getLabsConfigured,
    updateLabsOnConfig,
    runTf,
    instanceToData,
    vmToGoldenImage,
    getAwsInstanceDetails,
    awsConfigure,
    goldenToInstance,
    organizations,
    amiInformation,
    insertUsers,
    lab_batch,
    organizations_parameter,
    getLabBatchAssessment,
    sendEmail,
    deleteVm,
    deleteOrgAssignedCloudVms,
    handleLaunchSoftwareOrStop,
    getOperatingSystemsFromDataBase,
    getDecryptPasswordFromCloud,
    addOrganizationUser,
    getOrganizationUser,
    updateAssessmentStorage,createCloudAssignedInstance,
    getAssignLabOnLabId,deleteSuperVm,ConnectCorpAwsAccount,ConnectOrgAws,getCloudAssignedInstance,
    checkCloudAssignedInstanceLaunched,stopInstance,getSofwareDetails,getUserDecryptPasswordFromCloud,
    getNewIpFromCloud,deleteLab,getLabCatalogues,getAwsInstanceDetailsOfUsers,updatetAwsInstanceDetailsOfUsers,updatetAwsLabInstanceDetails,
    checkLabCloudInstanceLaunched,
    createOrganization,createNewCatalogue,goldenToInstanceForNewCatalogue
}