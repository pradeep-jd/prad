const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "postgres123", // change if yours is different
  port: 5432,
});

// Apply Template API
app.post("/apply-template", async (req, res) => {
  try {
    const template = req.body.template;

    let results = [];

    for (const row of template) {
      try {
        let sql = "";

        if (row.action === "CREATE_TABLE") {
          sql = `CREATE TABLE ${row.table_name} ();`;
        }

        if (row.action === "ADD_COLUMN") {
          sql = `ALTER TABLE ${row.table_name}
                 ADD COLUMN ${row.column_name} ${row.data_type};`;
        }

        if (row.action === "DROP_COLUMN") {
          sql = `ALTER TABLE ${row.table_name}
                 DROP COLUMN ${row.column_name};`;
        }

        // Execute SQL in PostgreSQL
        await pool.query(sql);

        results.push({
          table: row.table_name,
          status: "SUCCESS",
          sql,
        });

      } catch (err) {
        results.push({
          table: row.table_name,
          status: "FAILED",
          error: err.message,
        });
      }
    }

    res.json(results);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server Error",
    });
  }
});

app.get("/schema", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to load schema",
    });
  }
});

pool.connect()
  .then(() => {
    console.log("✅ PostgreSQL Connected");
  })
  .catch((err) => {
    console.error("❌ PostgreSQL Connection Failed");
    console.error(err);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
