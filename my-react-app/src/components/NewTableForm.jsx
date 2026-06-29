import { useState } from "react";

function NewTableForm({ onAddTable }) {
  const [tableName, setTableName] = useState("");
  const [verticalName, setVerticalName] = useState("");
  const [tableDefinition, setTableDefinition] = useState("");

  const handleSubmit = () => {
    if (!tableName.trim()) return;

    const newTable = {
        id: Date.now(),
        tableName,
        verticalName,
        tableDefinition,
        status: "pending",
        approved: false,
      };

    onAddTable(newTable);

    setTableName("");
    setVerticalName("");
    setTableDefinition("");
  };

  return (
    <div>
      <h3>Create New Table</h3>

      <label>Entity Logical Name</label>
      <input
        style={styles.input}
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
      />

      <label>Vertical Name</label>
      <input
        style={styles.input}
        value={verticalName}
        onChange={(e) => setVerticalName(e.target.value)}
      />

      <label>Table Definition</label>
      <textarea
        style={styles.textarea}
        value={tableDefinition}
        onChange={(e) => setTableDefinition(e.target.value)}
      />

      <button style={styles.button} onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
}

const styles = {
  input: {
    width: "100%",
    padding: "8px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    minHeight: "80px",
  },
  button: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    width: "100%",
  },
};

export default NewTableForm;