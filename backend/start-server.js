const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend server...');

const server = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  shell: true
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  
  // Restart server if it crashes
  if (code !== 0) {
    console.log('🔄 Restarting server in 5 seconds...');
    setTimeout(() => {
      console.log('🔄 Restarting now...');
      require('child_process').spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname),
        stdio: 'inherit',
        shell: true
      });
    }, 5000);
  }
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

console.log('✅ Backend server started with auto-restart');
