import { useState, useEffect } from "react";

function UpdateTableForm({ tables, onUpdateTable }) {
  const [selectedId, setSelectedId] = useState("");
  const [tableName, setTableName] = useState("");
  const [verticalName, setVerticalName] = useState("");
  const [tableDefinition, setTableDefinition] = useState("");


  // When selectedId changes, load table data
  const [formData, setFormData ] = useState({
    id: "",
    name: "",
    definition: ""
  });

  useEffect(() => {
    const selectedTable = tables.find((t) => t.id === Number(selectedId));
    if (selectedTable) {
      setTableName(selectedTable.tableName);
      setVerticalName(selectedTable.verticalName);
      setTableDefinition(selectedTable.tableDefinition);
    }
  }, [selectedId, tables]);

  const handleSave = () => {
    if (!selectedId) return;

    const updatedTable = {
      id: Number(selectedId),
      tableName,
      verticalName,
      tableDefinition,
      status: "pending",
      approved: false,
    };
  
    onUpdateTable(updatedTable);

    setSelectedId("");
    setTableName("");
    setVerticalName("");
    setTableDefinition("");
  };

  if (tables.length === 0) {
    return <p>No tables available to update.</p>;
  }

  return (
    <div>
      <h3>Update Existing Table</h3>

      <label>Select Table</label>
      <select
        style={styles.input}
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Select...</option>
        {tables.map((table) => (
          <option key={table.id} value={table.id}>
            {table.tableName}
          </option>
        ))}
      </select>
      
       <input
        value={formData.name}
        onChange={(e) =>
          setFormData({ ...formData, name: e.target.value })
        }
        placeholder="Table Name"
      />

      <textarea
        value={formData.definition}
        onChange={(e) =>
          setFormData({ ...formData, definition: e.target.value })
        }
        placeholder="Definition"
      />

      <button onClick={() => onUpdateTable({ id: Number(selectedId), tableName, verticalName, tableDefinition, status: "pending", approved: false })}>
        Update
      </button>

      {selectedId && (
        <>
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

          <button style={styles.button} onClick={handleSave}>
            Save Changes
          </button>
        </>
        
      )}
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

export default UpdateTableForm;