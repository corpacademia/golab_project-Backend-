const createdTables = require('../createTables/tables');
const {hashPassword , comparePassword} = require('../helper/authHelper');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
// const pool = require('../db/dbConnect');
const {Pool} = require('pg')


dotenv.config()
const pool = new Pool({
  user: process.env.user,
  host: process.env.host,
  database:process.env.database,
  password:process.env.password,
  port: process.env.port,
});

const signupController = async(req,res)=>{
    try{
        const {name,email,password} = req.body;
        const query_instance = `INSERT INTO users (name,email,password) VALUES($1,$2,$3) RETURNING *`
        const HashedPassword = await hashPassword(password)
        const result = await pool.query(query_instance,[name,email,HashedPassword])
        if(!result.rows[0]){
            return res.status(405).send({
                success:false,
                message:"Error occured in storing data", 
            })
        }
        return res.status(200).send({
            success:true,
            result:result.rows[0],
            message:"Successfully inserted data",
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Could not insert the data",
            error
        })
    }
    
 }

const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            console.error("Email or Password is missing");
            return res.status(400).send({ success: false, message: "Email or Password is missing" });
        }

        // First, query the users table for the user
        let getUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (getUser.rows.length === 0) {
            // If no user is found in the users table, query the organization_users table
            getUser = await pool.query('SELECT * FROM organization_users WHERE email = $1', [email]);
        }

        if (getUser.rows.length === 0) {
            console.error(`User not found with email: ${email}`);
            return res.status(404).send({ success: false, message: "User not found" });
        }

        const user = getUser.rows[0]; // Get the first matched user

        // Compare password
        const comparedPassword = await comparePassword(password, user.password);
        if (!comparedPassword) {
            console.error("Invalid password for user:", email);
            return res.status(401).send({ success: false, message: "Invalid Password" });
        }

        // Update Last Active Date
        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const lastActiveDate = `${day} ${monthNames[month]} ${year}`;

        // Determine which table to update based on the user source
        const updateQuery = user.admin_id ? // Checks if the user is from organization_users table
            `UPDATE organization_users SET lastactive = $1 WHERE email = $2 RETURNING *` :
            `UPDATE users SET lastactive = $1 WHERE email = $2 RETURNING *`;

        const lactive = await pool.query(updateQuery, [lastActiveDate, email]);

        if (!lactive.rows[0]) {
            console.error("Could not update last active for user:", email);
            return res.status(500).send({ success: false, message: "Could not update last active" });
        }

        // Generate JWT Token
        const token = jwt.sign({ _id: user.id }, process.env.SECRET_KEY);

        // Set the JWT token in an HTTP-only cookie.
        res.cookie("session_token", token, {
            httpOnly: true,                                  // Inaccessible to JavaScript
            secure: process.env.NODE_ENV === "production",   // True in production (HTTPS only)
            sameSite: "Lax",                              // Helps prevent CSRF attacks
            maxAge: 24 * 60 * 60 * 1000                       // Cookie expires in 1 day
        });

        // Optionally, do not include the token in the response body
        return res.status(200).send({
            success: true,
            message: "Successfully Accessed",
            result: user
        });

    } catch (error) {
        console.error("Internal Server Error:", error);  // Logging the error
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};





const getAllUsers = async (req,res)=>{
    try{
        const query_instance=`select * from users`;
        const result = await pool.query(query_instance)

        if(!result.rows){
            return res.status(204).send({
                success:false,
                message:"No users are available",
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed users",
            data:result.rows
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Could not access the users",
            error
        })
    }
}
const addUser = async (req,res)=>{
    try{
        const {name,email,role,organization}=req.body.formData;
        const {id}= req.body.user;
        const password='123';
        const HashedPassword = await hashPassword(password)
        const query_instance =`INSERT INTO users (name,email,password,role,organization,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`;
        const result = await pool.query(query_instance,[name,email,HashedPassword,role,organization,id])
        if(!result.rows[0]){
            return res.status(204).send({
                success:false,
                message:"could not add user",
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully added user",
            data:result.rows[0],
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Could not add the user",
            error:error.message,
            detail:error.detail,
        })
    }
}
const getUserData = async (req, res) => {
    try {
      const userId = req.params.id;
  
      // Query 1: Fetch user data from 'users' table
      let user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  
      // If user is not found in 'users' table, query 'organization_users' table
      if (!user.rows[0]) {
        user = await pool.query('SELECT * FROM organization_users WHERE id = $1', [userId]);
        if (!user.rows[0]) {
          return res.status(404).json({ message: 'User not found in both tables' });
        }
      }
  
      // Query 2: Fetch User stats
      const stats = await pool.query('SELECT * FROM UserStats WHERE UserId = $1', [userId]);
  
      // Query 3: Fetch User certifications (if in a separate table)
      const certifications = await pool.query('SELECT CertificationName FROM Certifications WHERE UserId = $1', [userId]);
  
      // Combine results
      const response = {
        user: user.rows[0],  // Basic user information
        stats: stats.rows[0] || {},  // User statistics (if available)
        certifications: certifications.rows.map(row => row.certificationname),  // Certification list
      };
  
      if (!response.user) {
        return res.status(204).send({
          success: false,
          message: 'No data available for the user',
        });
      }
  
      return res.status(200).send({
        success: true,
        message: 'Successfully accessed user data',
        response,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({
        success: false,
        message: 'Could not access the user data',
        error,
      });
    }
  };
  

const updateUserOrganization = async(req,res)=>{
    try{
        const {userId,values} = req.body;
        const [org_name,type]=values.split(',');
        if(!userId || !org_name || !type ){
            return res.send("Some field is missing")
        }
        const update_query = `update users set organization = $1 , organization_type = $2  where id =$3 returning *`
        const update = await pool.query(update_query,[org_name,type,userId]);

        if(!update.rows[0]){
            return res.status(404).send({
                success:false,
                message:"Invalid field or userid"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated",
            data:update.rows[0],
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Could not update the field",
            error,
        })
    }
}

const updateUserRole = async(req,res)=>{
    try{
        const {userId,role} = req.body;
        if(!userId || !role){
            return res.send("Userid or role is missing")
        }
        const update_query = `update users set role = $1 where id = $2 returning *`;
        const update = await pool.query(update_query,[role,userId]);

        if(!update.rows[0]){
            return res.status(400).send({
                success:false,
                message:"Userid or role is invalid"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated users role",
            data:update.rows[0]
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Could not update data",
            error,
        })
    }
}

//access the token and decode it to get the user id and its details from the database
const getTokenAndGetUserDetails = async(req,res,next)=>{
    try {
        // Retrieve the token from cookies or headers (adjust as needed)
        const token = req.cookies.session_token || req.headers['authorization'];
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
    
        // Verify and decode the token using your secret key
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded._id; // Assumes token payload contains an 'id' field
    
        // First, query the "users" table for the user
        let result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length > 0) {
          req.userData = result.rows[0];
          return next();
        }
    
        // If not found, query the "organization_users" table
        result = await pool.query('SELECT * FROM organization_users WHERE id = $1', [userId]);
        if (result.rows.length > 0) {
          req.userData = result.rows[0];
          return next();
        }
    
        // If not found in either table, return a 404 error
        return res.status(404).json({ error: 'User not found' });
      } catch (error) {
        console.error('Error processing token or querying database:', error);
        return res.status(401).json({ error: 'Invalid token or server error' });
      }
}

const logoutController = async(req,res)=>{
    try{
        res.clearCookie("session_token")
        return res.status(200).send({
            success:true,
            message:"Successfully logged out",
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Could not log out",
            error,
        })
    }               
}

//update the organization or root users details 
const updateUserController = async (req, res) => {
    try {
      const { id } = req.params; // user id from URL
      const { name, email, password } = req.body; // updated fields
      const hashedPassword = await hashPassword(password);
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "User id is required",
        });
      }
  
      let query, values, result;
  
      // 1. Check in the users table
      result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      if (result.rows.length > 0) {
        const existingUser = result.rows[0];
        // If a password is provided, check if it is the same as the old password
        if (hashedPassword && await comparePassword(password,existingUser.password)  ) {
          return res.status(400).json({
            success: false,
            message: "Password similar to old password",
          });
        }
  
        // Prepare the update query for users table
        if (password) {
          query =
            "UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *";
          values = [name, email, hashedPassword, id];
        } else {
          query = "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *";
          values = [name, email, id];
        }
        result = await pool.query(query, values);
        return res.status(200).json({
          success: true,
          message: "User updated successfully in users table",
          data: result.rows[0],
        });
      }
  
      // 2. If not found in users, check in organization_users table
      result = await pool.query("SELECT * FROM organization_users WHERE id = $1", [
        id,
      ]);
      if (result.rows.length > 0) {
        const existingUser = result.rows[0];
        // If a password is provided, check if it is the same as the old password
        if (hashedPassword && await comparePassword(password,existingUser.password)) {
          return res.status(400).json({
            success: false,
            message: "Password similar to old password",
          });
        }
  
        // Prepare the update query for organization_users table
        if (password) {
          query =
            "UPDATE organization_users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *";
          values = [name, email, hashedPassword, id];
        } else {
          query =
            "UPDATE organization_users SET name = $1, email = $2 WHERE id = $3 RETURNING *";
          values = [name, email, id];
        }
        result = await pool.query(query, values);
        return res.status(200).json({
          success: true,
          message: "User updated successfully in organization_users table",
          data: result.rows[0],
        });
      }
  
      // 3. If the user is not found in either table
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };
  

  //get the users of organization both users and admins
  const getUsersFromOrganization = async (req, res) => {
    const { orgId } = req.params; 

    try {
        
        const usersQuery = `
            SELECT * 
            FROM users 
            WHERE org_id = $1
        `;

       
        const orgUsersQuery = `
            SELECT * 
            FROM organization_users 
            WHERE org_id = $1
        `;

        
        const [usersResult, orgUsersResult] = await Promise.all([
            pool.query(usersQuery, [orgId]),
            pool.query(orgUsersQuery, [orgId])
        ]);

       
        const users = [...usersResult.rows, ...orgUsersResult.rows];

        
        if (users.length === 0) {
            return res.status(404).send({
              success:false,
              message: "No users found for this organization." });
        }

        
        return  res.send({ 
          success: true,
          message: "Users found",
          data: users
         });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ 
          success: false, 
          error: "Internal Server Error" 
        });
    }
};

//delete the users
const deleteUsers = async (req, res) => {
  const { orgId , userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or missing userIds array." });
  }

  try {
      // Start a transaction
      await pool.query("BEGIN");

      // Delete from users table
      const deleteUsersQuery = `
          DELETE FROM users 
          WHERE id = ANY($1) AND org_id = $2
          RETURNING id
      `;
      const deletedUsers = await pool.query(deleteUsersQuery, [userIds, orgId]);

      // Get IDs of users that were deleted from the users table
      const deletedUserIds = deletedUsers.rows.map(row => row.id);

      // Identify remaining user IDs that were not deleted from users table
      const remainingUserIds = userIds.filter(id => !deletedUserIds.includes(id));

      let deletedOrgUsers = [];
      if (remainingUserIds.length > 0) {
          // Delete from organization_users table
          const deleteOrgUsersQuery = `
              DELETE FROM organization_users 
              WHERE id = ANY($1) AND org_id = $2
              RETURNING id
          `;
          deletedOrgUsers = await pool.query(deleteOrgUsersQuery, [remainingUserIds, orgId]);
      }

      // Commit the transaction
      await pool.query("COMMIT");

      if (deletedUsers.rowCount === 0 && deletedOrgUsers.rowCount === 0) {
          return res.status(404).send({ success: false, message: "No matching users found for deletion." });
      }

      return res.status(200).send({
          success: true,
          message: "Users deleted successfully.",
          deletedUsers: deletedUserIds,
          deletedOrgUsers: deletedOrgUsers.rows.map(row => row.user_id)
      });
  } catch (error) {
      await pool.query("ROLLBACK"); // Rollback in case of an error
      console.error("Error deleting users:", error);
      return res.status(500).send({ 
          success: false,
          error: "Internal Server Error"
         });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;  
  const { name, email, role, status } = req.body; 

  try {
      
      const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

      if (userResult.rows.length > 0) {
          
          await pool.query(
              "UPDATE users SET name = $1, email = $2, role = $3, status = $4 WHERE id = $5",
              [name, email, role, status, id]
          );
          return res.status(200).send({
            success:true,
            message: "User updated successfully in users table",
           });
      }

      // If not found in 'users' table, check in 'organization_users' table
      const orgUserResult = await pool.query("SELECT * FROM organization_users WHERE id = $1", [id]);

      if (orgUserResult.rows.length > 0) {
          // User found in 'organization_users' table, update the user
          await pool.query(
              "UPDATE organization_users SET name = $1, email = $2, role = $3, status = $4 WHERE id = $5",
              [name, email, role, status, id]
          );
          return res.status(200).send({
            success:true,
            message: "User updated successfully in organization_users table" });
      }

      // If user is not found in both tables
      return res.status(404).send({
        success:false,
        message: "User not found in both tables"
       });

  } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).send({ 
        success:false,
        message: "Internal server error",
        error:error.message
      });
  }
};


module.exports={
    signupController,
    loginController,
    getAllUsers,
    addUser,
    getUserData,
    updateUserOrganization,
    updateUserRole,
    getTokenAndGetUserDetails,
    logoutController,
    updateUserController,
    getUsersFromOrganization,
    deleteUsers, 
    updateUser,
}