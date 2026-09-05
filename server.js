const { app } = require('./routes/pages');
require('./routes/admin');

const PORT = process.env.PORT || 3000;

app.use((req, res) => res.status(404).render('error', { title: 'Not Found', message: res.locals.t.not_found }));

app.listen(PORT, () => {
  console.log(`Maison Noir is open at http://localhost:${PORT}`);
  console.log('Admin login:  admin@maisonnoir.com / admin123');
  console.log('Demo account: customer@maisonnoir.com / customer123');
});
