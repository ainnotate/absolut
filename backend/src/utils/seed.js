require('dotenv').config();
const bcrypt = require('bcrypt');
const { db, initializeDatabase } = require('../models/database');

const seedUsers = async () => {
  try {
    await initializeDatabase();
    console.log('🌱 Starting database seeding...');

    const users = [
      {
        username: 'admin',
        email: 'admin@absolute.com',
        password: 'admin123',
        role: 'admin',
        first_name: 'System',
        last_name: 'Administrator'
      },
      {
        username: 'supervisor1',
        email: 'supervisor@absolute.com',
        password: 'supervisor123',
        role: 'supervisor',
        first_name: 'John',
        last_name: 'Supervisor'
      },
      {
        username: 'qc_user1',
        email: 'qc@absolute.com',
        password: 'qc123',
        role: 'qc_user',
        first_name: 'Jane',
        last_name: 'Quality'
      },
      {
        username: 'uploader1',
        email: 'uploader@absolute.com',
        password: 'upload123',
        role: 'upload_user',
        first_name: 'Bob',
        last_name: 'Uploader'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO users (username, email, password, role, first_name, last_name) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [user.username, user.email, hashedPassword, user.role, user.first_name, user.last_name],
          function(err) {
            if (err) {
              console.error(`❌ Error creating user ${user.username}:`, err);
              reject(err);
            } else {
              console.log(`✅ Created user: ${user.username} (${user.role})`);
              resolve();
            }
          }
        );
      });
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Default users created:');
    console.log('- Admin: admin@absolute.com / admin123');
    console.log('- Supervisor: supervisor@absolute.com / supervisor123');
    console.log('- QC User: qc@absolute.com / qc123');
    console.log('- Upload User: uploader@absolute.com / upload123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedUsers();