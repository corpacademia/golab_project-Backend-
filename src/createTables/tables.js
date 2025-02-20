const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', 
  host: 'localhost',  
  database: 'golab',
  password: 'Corp@123', 
  port: 5432,                  
});

const enableUuidExtension = async () => {
  try {
    const client = await pool.connect();
    // Enable the uuid-ossp extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('uuid-ossp extension enabled successfully!');
    client.release();
  } catch (err) {
    console.error('Error enabling uuid-ossp extension:', err.message);
  }
  // finally {
  //   await pool.end();
  // }
};

enableUuidExtension();

// Function to create tables
const  createTables= async ()=> {
  const client = await pool.connect();

  try {
    // Create the 'users' table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        organization VARCHAR(255),
        organization_type VARCHAR(255),
        role VARCHAR(255) DEFAULT user,
        status VARCHAR(255) DEFAULT pending,
        created_by UUID ,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastActive VARCHAR(255),
         FOREIGN KEY (created_by) 
    REFERENCES users(id)
    ON DELETE SET NULL 
    ON UPDATE CASCADE
      );
    `);

    // Create the 'createLab' table with foreign key reference to 'users'
    await client.query(`
      CREATE TABLE IF NOT EXISTS createLab (
        lab_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        description VARCHAR(255),
        duration VARCHAR(255),
        type TEXT,
        platform Text,
        provider  VARCHAR(255),
        cpu NUMERIC(5),
        ram NUMERIC(5),
        storage NUMERIC(5),
        instance VARCHAR(255),
        os varchar(255),
        os_version(255),
           difficulty VARCHAR(50)  DEFAULT 'beginner',
    status VARCHAR(50)  DEFAULT 'available',
    rating FLOAT DEFAULT 0.0,
    total_enrollments INT DEFAULT 0,
    configured BOOLEAN NOT NULL,
    configured_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

      //create table for organization
      await client.query(`
        create table if not exists organizations(
        id uuid default uuid_generate_v4() PRIMARY KEY,
        organization_name varchar(255),
        org_id varchar(255),
        org_admin uuid references users(id))`)

    //create table 'aws_ec2'  for storing in the database
    await client.query(
    `CREATE TABLE IF NOT EXISTS aws_ec2 (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    instance_name VARCHAR(255),
    memory VARCHAR(50),
    vcpu VARCHAR(50),
    storage VARCHAR(50),
    network_performance VARCHAR(50),
    on_demand_windows_base_pricing VARCHAR(50),
    on_demand_ubuntu_pro_base_pricing VARCHAR(50),
    on_demand_suse_base_pricing VARCHAR(50),
    on_demand_rhel_base_pricing VARCHAR(50),
    on_demand_linux_base_pricing VARCHAR(50),
    service VARCHAR(50)
);
`)
//create table to store ami id data
await pool.query(
  `CREATE TABLE IF NOT EXISTS amiInformation (
  lab_id uuid references createlab(lab_id),
  ami_id varchar(255))`
)

      //create lab for configurations
      await pool.query(`
      CREATE TABLE if not exists lab_configurations (
    config_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lab_id UUID NOT NULL REFERENCES createlab(lab_id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    config_details JSONB NOT NULL,
    configured_at TIMESTAMP DEFAULT NOW()
    );
    `)

    //create a table for a batch assignment
    await pool.query(`
      create table if not exists lab_batch (
      batch_id uuid default uuid_generate_v4(),
      lab_id uuid,
      admin_id uuid references users(id),
      org_id uuid references organizations(id),
      software text[],
      config_details json,
      configured_by uuid references users(id))
 `)
    
    //create table for user stats
    await pool.query(`
    CREATE TABLE IF NOT EXISTS UserStats (
    UserId UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,  -- Primary Key and Foreign Key referencing Users
    CompletedLabs INT NOT NULL,
    ActiveAssessments INT NOT NULL,
    AverageScore DECIMAL(5, 2) NOT NULL,  
    TotalPurchases INT NOT NULL,
    LearningHours INT NOT NULL
   
);
`)

// create a table for labassignment
await pool.query(`
  CREATE TABLE if not exists LabAssignments (
assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- Unique identifier for each assignment
lab_id UUID NOT NULL,  -- Reference to the lab assigned
assigned_admin_id UUID NOT NULL, -- Reference to the admin who assigned the lab
user_id UUID NOT NULL,  -- Reference to the user assigned to the lab
status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),  -- Status of the assignment
start_date TIMESTAMP DEFAULT NOW(),  -- When the lab was assigned
duration INT,
completion_date TIMESTAMP,  -- When the lab was completed
progress_percentage INT CHECK (progress_percentage >= 0 AND progress_percentage <= 100),  -- Progress percentage (0-100%)
remarks TEXT,  -- Optional remarks
FOREIGN KEY (lab_id) REFERENCES createlab(lab_id),  -- Assuming there's a Labs table
FOREIGN KEY (user_id) REFERENCES users(id)  -- Assuming there's a Users table
);

  `)


//create certifications table for individual user
       await pool.query (`CREATE TABLE if not exists Certifications (
        CertificationId UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        UserId UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Foreign Key referencing Users
        CertificationName VARCHAR(255) NOT NULL

        );`)



    console.log("Tables created successfully!");

  } catch (error) {
    console.error("Error creating tables:", error.message);
  } finally {
    // Always release the client, even if there's an error
    client.release();
  }
}

// Call the function to create the tables
createTables();

module.exports = createTables;
