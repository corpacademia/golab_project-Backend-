const { Pool } = require('pg');
const { spawn } = require('child_process');
const createdTables = require('../createTables/tables')
const dotenv = require('dotenv')
const multer = require('multer')
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

const getOrganizationStats = async (req, res) => {
    const { orgId } = req.params; // Get org_id from request params
    try {
        // Query to get the count of users in `organization_users`
        const usersCountQuery = `
            SELECT COUNT(*) AS user_count 
            FROM organization_users 
            WHERE org_id = $1
        `;

        // Query to get the count of admins in `users`
        const adminsCountQuery = `
            SELECT COUNT(*) AS admin_count 
            FROM users 
            WHERE org_id = $1 AND role = 'orgadmin'
        `;

        // Execute both queries in parallel for better performance
        const [usersCountResult, adminsCountResult] = await Promise.all([
            pool.query(usersCountQuery, [orgId]),
            pool.query(adminsCountQuery, [orgId])
        ]);

        // Extract counts from the results
        const userCount = usersCountResult.rows[0].user_count;
        const adminCount = adminsCountResult.rows[0].admin_count;
        if (userCount === 0 && adminCount === 0) {
            return res.status(404).send({
                success: false,
                 message: "No users or admins found for this organization."
                 });
        }
        // Send the response
        return res.status(200).send({
            success: true,
            message: "Organization stats fetched successfully.", 
            data: {
                users: Number(userCount),
                admins: Number(adminCount)
            }
         });
    } catch (error) {
        console.error("Error fetching organization stats:", error);
        res.status(500).send({ success:false,
            message: "Error fetching organization stats",
            error: error.message || "Internal Server Error" });
    }
};

module.exports = {
    getOrganizationStats
};