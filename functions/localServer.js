const app = require('./expressApp');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Local Express app listening on http://localhost:${PORT}`);
});
