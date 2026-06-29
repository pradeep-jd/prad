import react, { useState } from "react";
function TableList({ tables, onDelete }) {
  if (tables.length === 0) return null;
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div style={{ marginTop: "30px", width: "100%" }}>
      <h3 style={{ marginBottom: "20px", fontSize: "18px" }}>
  Created Tables
</h3>

      {tables.map((table) => (
        <div
  key={table.id}
  style={{
    ...styles.card,
    transform:
      hoveredId === table.id ? "translateY(-4px)" : "translateY(0)",
  }}
  onMouseEnter={() => setHoveredId(table.id)}
  onMouseLeave={() => setHoveredId(null)}
>

          <button
            style={styles.deleteButton}
            onClick={() => onDelete(table.id)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  marginBottom: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  transition: "all 0.2s ease",
},
  deleteButton: {
  marginTop: "15px",
  backgroundColor: "#dc2626",
  color: "white",
  padding: "8px 14px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
},
};

export default TableList;