const { Pool } = require('pg');
const createdTables = require('../createTables/tables')
const {hashPassword , comparePassword} = require('../helper/authHelper')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')


dotenv.config()
const pool = new Pool({
  user: process.env.user,
  host: process.env.host,
  database:process.env.database,
  password:process.env.password,
  port: process.env.port,
});

// const connect = async ()=>{
//     const client = await pool.connect();
// }
// connect();

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
            sameSite: "Strict",                              // Helps prevent CSRF attacks
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

module.exports={
    signupController,
    loginController,
    getAllUsers,
    addUser,
    getUserData,
    updateUserOrganization,
    updateUserRole,
}