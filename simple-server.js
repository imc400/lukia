const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>LUKIA - Test Server</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 50px; text-align: center; }
          h1 { color: #2563eb; }
          .status { background: #10b981; color: white; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>🎉 LUKIA Server is Working!</h1>
        <div class="status">
          <h2>Connection Successful</h2>
          <p>The server is running and accessible.</p>
          <p>Time: ${new Date().toLocaleString()}</p>
          <p>URL: ${req.url}</p>
        </div>
      </body>
    </html>
  `);
});

const PORT = 3333;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Simple server running at http://localhost:${PORT}`);
  console.log(`✅ Also accessible at http://0.0.0.0:${PORT}`);
});