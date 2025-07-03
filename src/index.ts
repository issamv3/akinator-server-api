import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(
    `📝 API Documentation: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}/health`
  );
});
