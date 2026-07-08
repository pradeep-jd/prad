import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NewTableForm from "../components/NewTableForm";
import UpdateTableForm from "../components/UpdateTableForm";
import TableList from "../components/TableList";

function Dashboard() {
  const navigate = useNavigate();

  const [selectedTable, setSelectedTable] = useState("");
  const [mode, setMode] = useState(null);

  const [tables, setTables] = useState(() => {
    const savedTables = localStorage.getItem("tables");
    return savedTables ? JSON.parse(savedTables) : [];
  });

  const [message, setMessage] = useState("");

  const userRole = localStorage.getItem("userRole") || "developer";

  const handleAccept = (id) => {
    const updated = tables.map((t) =>
      t.id === id ? { ...t, status: "approved", approved: true } : t
    );
    setTables(updated);
    setMessage("Change accepted");
  };

  const handleEditPending = (id, field, value) => {
    const updated = tables.map((t) =>
      t.id === id ? { ...t, [field]: value } : t
    );
    setTables(updated);
  };

  useEffect(() => {
    localStorage.setItem("tables", JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    const handleStorage = () => {
      const savedTables = localStorage.getItem("tables");
      if (savedTables) {
        const parsed = JSON.parse(savedTables);
        setTables(prev => {
          if (JSON.stringify(prev) === savedTables) {
            return prev;
          }
          return parsed;
        });
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div style={{ padding: "40px" }}>
      <h2>Developers / Architects</h2>

      {/* Cards Row */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "30px",
        }}
      >
        <div style={card} onClick={() => setMode("new")}>
          <h3>➕</h3>
          <p>New Table</p>
        </div>

        <div style={card} onClick={() => setMode("update")}>
          <h3>✏️</h3>
          <p>Update Table</p>
        </div>

        <div style={card} onClick={() => setMode("process")}>
          <h3>⚙️</h3>
          <p>Process Template</p>
        </div>

        <div
          style={card}
          onClick={() =>
            navigate("/datamodel", {
              state: { selectedTable },
            })
          }
        >
          <h3>🧩</h3>
          <p>Refresh Template</p>
        </div>
      </div>

      {/* Table Dropdown */}
      <p>(And/Or)</p>

      <select
        value={selectedTable}
        onChange={(e) => setSelectedTable(e.target.value)}
        style={{
          width: "300px",
          padding: "10px",
          borderRadius: "8px",
          marginBottom: "30px",
        }}
      >
        <option value="">Select Table</option>

        {tables.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      {/* Forms */}
      <div style={{ marginTop: "20px" }}>
        {mode === "new" && (
          <NewTableForm
            onAddTable={(newTable) => {
              setTables([...tables, newTable]);
              setMessage("Table created successfully");
            }}
          />
        )}

        {mode === "update" && (
          <UpdateTableForm
            tables={tables}
            selectedTable={selectedTable}
            onUpdateTable={(updatedTable) => {
              const updatedTables = tables.map((t) =>
                t.id === updatedTable.id ? updatedTable : t
              );

              setTables(updatedTables);
              setMessage("Table updated successfully");
            }}
          />
        )}

        {mode === "process" && (
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              marginTop: "20px",
            }}
          >
            <h3>Processing Template</h3>
          </div>
        )}
      </div>

      {/* Table List */}

      {userRole === "architect" && (
        <div style={{ marginTop: "20px", background: "#fff", padding: "20px", borderRadius: "8px" }}>
          <h3>Pending Changes from Developers</h3>
          {tables.filter((t) => t.status === "pending").length === 0 ? (
            <p>No pending changes</p>
          ) : (
            tables
              .filter((t) => t.status === "pending")
              .map((t) => (
                <div key={t.id} style={{ marginBottom: "12px", border: "1px solid #e5e7eb", padding: "10px", borderRadius: "6px" }}>
                  <input value={t.tableName} onChange={(e) => handleEditPending(t.id, "tableName", e.target.value)} style={{ width: "60%", marginRight: "8px", padding: "6px" }} />
                  <button onClick={() => handleAccept(t.id)} style={{ marginRight: "8px" }}>Accept</button>
                </div>
              ))
          )}
        </div>
      )}

      <div style={{ marginTop: "30px" }}>
        <TableList tables={tables} />
      </div>

      {message && (
        <p
          style={{
            color: "green",
            fontWeight: "bold",
            marginTop: "20px",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

const card = {
  background: "white",
  padding: "25px",
  borderRadius: "10px",
  textAlign: "center",
  cursor: "pointer",
  border: "1px solid #e5e7eb",
  minWidth: "180px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export default Dashboard;