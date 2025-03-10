const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "golab",
  password: "Corp@123",
  port: 5432,
});

const enableUuidExtension = async () => {
  try {
    const client = await pool.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log("uuid-ossp extension enabled successfully!");
    client.release();
  } catch (err) {
    console.error("Error enabling uuid-ossp extension:", err.message);
  }
};

enableUuidExtension();

const createTables = async () => {
  const client = await pool.connect();

  try {
    // Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        organization VARCHAR(255),
        organization_type VARCHAR(255),
        role VARCHAR(255) DEFAULT 'user',
        status VARCHAR(255) DEFAULT 'pending',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastActive VARCHAR(255),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // CreateLab Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS createLab (
        lab_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        description VARCHAR(255),
        duration VARCHAR(255),
        type TEXT,
        platform TEXT,
        provider VARCHAR(255),
        cpu NUMERIC(5),
        ram NUMERIC(5),
        storage NUMERIC(5),
        instance VARCHAR(255),
        snapshot_type VARCHAR(255) DEFAULT 'hibernate' CHECK (snapshot_type IN ('snapshot', 'hibernate')),
        os VARCHAR(255),
        os_version VARCHAR(255),  -- ✅ Fixed Syntax Error
        difficulty VARCHAR(50) DEFAULT 'beginner',
        status VARCHAR(50) DEFAULT 'available',
        rating FLOAT DEFAULT 0.0,
        total_enrollments INT DEFAULT 0,
        configured BOOLEAN NOT NULL,
        configured_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Organizations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        organization_name VARCHAR(255),
        org_id VARCHAR(255),
        org_admin UUID REFERENCES users(id)
      );
    `);

    // AWS EC2 Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS aws_ec2 (
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
    `);

    // AMI Information Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS amiInformation (
        lab_id UUID REFERENCES createLab(lab_id),
        ami_id VARCHAR(255)
      );
    `);

    // Lab Configurations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_configurations (
        config_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        lab_id UUID NOT NULL REFERENCES createLab(lab_id) ON DELETE CASCADE,
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        config_details JSONB NOT NULL,
        configured_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Lab Batch Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_batch (
        batch_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        lab_id UUID,
        admin_id UUID REFERENCES users(id),
        org_id UUID REFERENCES organizations(id),
        software TEXT[],
        config_details JSON,
        configured_by UUID REFERENCES users(id)
      );
    `);

    // User Stats Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS UserStats (
        UserId UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        CompletedLabs INT NOT NULL,
        ActiveAssessments INT NOT NULL,
        AverageScore DECIMAL(5, 2) NOT NULL,
        TotalPurchases INT NOT NULL,
        LearningHours INT NOT NULL
      );
    `);

    // Lab Assignments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS LabAssignments (
        assignment_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        lab_id UUID NOT NULL REFERENCES createLab(lab_id),
        assigned_admin_id UUID NOT NULL REFERENCES users(id),
        user_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
        start_date TIMESTAMP DEFAULT NOW(),
        duration INT,
        completion_date TIMESTAMP,
        progress_percentage INT CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        remarks TEXT,
        launched BOOLEAN default false
      );
    `);

    // Certifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Certifications (
        CertificationId UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        UserId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        CertificationName VARCHAR(255) NOT NULL
      );
    `);

    //workspace table
    await client.query(`CREATE TABLE workspace (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lab_name TEXT NOT NULL,
    description TEXT,
    lab_type TEXT NOT NULL,
    documents TEXT[] DEFAULT '{}',
    url TEXT[] DEFAULT '{}',
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    created_by UUID NOT NULL
);
`);

    console.log("Tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error.message);
  } finally {
    client.release();
  }
};

createTables();

module.exports = createTables;
