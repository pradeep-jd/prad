import { useState, useEffect, useContext } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { ThemeContext } from "../App";
 
// ─── Design tokens ────────────────────────────────────────────────────────────
const tokens = {
  light: {
    bg: "#f0f2f5",
    surface: "#ffffff",
    surfaceAlt: "#f8f9fb",
    border: "#e4e7ec",
    text: "#111827",
    textMuted: "#6b7280",
    sidebar: "#ffffff",
    tableHead: "#f3f4f6",
    inputBorder: "#d1d5db",
    inputBg: "#ffffff",
  },
  dark: {
    bg: "#0f1117",
    surface: "#1a1d27",
    surfaceAlt: "#22263a",
    border: "#2d3148",
    text: "#e5e7eb",
    textMuted: "#9ca3af",
    sidebar: "#13161f",
    tableHead: "#22263a",
    inputBorder: "#374151",
    inputBg: "#1f2330",
  },
};
 
const accent = {
  blue: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
  purple: "#8b5cf6",
  amber: "#f59e0b",
};
 
// ─── Small reusable components ────────────────────────────────────────────────
 
function Badge({ status }) {
  const ok = status === "SUCCESS";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        background: ok ? "#d1fae5" : "#fee2e2",
        color: ok ? "#065f46" : "#991b1b",
      }}
    >
      {status}
    </span>
  );
}
 
function StatCard({ label, value, color, dark }) {
  const t = dark ? tokens.dark : tokens.light;
  return (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      padding: "16px",
      borderRadius: "12px",
      background: t.surface,
      border: `1px solid ${t.border}`,
    }}
  >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: t.textMuted,
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "32px", fontWeight: 800, color }}>
        {value}
      </div>
    </div>
  );
}
 
function Btn({ children, onClick, disabled, variant = "default", dark = false, style: extra }) {
  const base = {
    padding: "9px 18px",
    border: "none",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    fontSize: "13px",
    transition: "opacity 0.15s",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
  };
  const variants = {
    default: { background: dark ? "#2d3148" : "#f3f4f6", color: dark ? "#e5e7eb" : "#374151" },
    primary: { background: accent.blue, color: "#fff" },
    danger: { background: accent.red, color: "#fff" },
    success: { background: accent.green, color: "#fff" },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...extra }}
    >
      {children}
    </button>
  );
}
 
// ─── Main component ───────────────────────────────────────────────────────────
 
function DataModelForm() {
  const { mode } = useContext(ThemeContext);
  const [previewData, setPreviewData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [file, setFile] = useState(null);
  const [sqlPreview, setSqlPreview] = useState("");
  const [schemaData, setSchemaData] = useState([]);
  const [executionResults, setExecutionResults] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSection, setActiveSection] = useState("upload");

  const recordsPerPage = 5;
 
  // Persist history
  useEffect(() => {
    const saved = localStorage.getItem("executionHistory");
    if (saved) setExecutionHistory(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("executionHistory", JSON.stringify(executionHistory));
  }, [executionHistory]);
 
  // Regenerate SQL whenever data changes
  useEffect(() => {
    if (previewData.length > 0) generateSQL(previewData);
    else setSqlPreview("");
  }, [previewData]);
 
  const t = mode === 'dark' ? tokens.dark : tokens.light;
 
  // ── Validation ──────────────────────────────────────────────────────────────
  const validateData = (data) => {
    const newErrors = data.map((row) => {
      const rowErrors = [];
      if (!row.action) rowErrors.push("Missing action");
      if (!row.table_name) rowErrors.push("Missing table_name");
      if (row.action === "ADD_COLUMN") {
        if (!row.column_name) rowErrors.push("Missing column_name");
        if (!row.data_type) rowErrors.push("Missing data_type");
      }
      if (row.action === "DROP_COLUMN") {
        if (!row.column_name) rowErrors.push("Missing column_name");
      }
      return rowErrors;
    });
    setErrors(newErrors);
  };

  useEffect(() => {
    const checkPendingTemplate = () => {
      const pending = localStorage.getItem("pendingTemplateFile");
      if (pending) {
        try {
          const { name, data } = JSON.parse(pending);
          setFile({ name });
          setPreviewData(data);
          validateData(data);
          setActiveSection("upload");
        } catch (e) {
          console.error("Failed to parse pending template data", e);
        }
        localStorage.removeItem("pendingTemplateFile");
      }
    };

    checkPendingTemplate();

    window.addEventListener("templateUploaded", checkPendingTemplate);
    return () => {
      window.removeEventListener("templateUploaded", checkPendingTemplate);
    };
  }, []);
 
  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
 
    if (selectedFile.name.endsWith(".csv")) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreviewData(results.data);
          validateData(results.data);
        },
      });
    } else if (selectedFile.name.endsWith(".xlsx")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(event.target.result);
        const worksheet = workbook.worksheets[0];
        const headers = [];
        const data = [];
        worksheet.getRow(1).eachCell((cell) => headers.push(cell.value));
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            rowData[headers[colNumber - 1]] = cell.value;
          });
          data.push(rowData);
        });
        setPreviewData(data);
        validateData(data);
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };
 
  // ── Row operations ──────────────────────────────────────────────────────────
  const handleCellChange = (index, field, value) => {
    const updated = [...previewData];
    updated[index] = { ...updated[index], [field]: value };
    setPreviewData(updated);
    validateData(updated);
  };
 
  const handleAddRow = () => {
    const newRow = { action: "", table_name: "", column_name: "", data_type: "" };
    const updated = [...previewData, newRow];
    setPreviewData(updated);
    validateData(updated);
  };

  const handleAdd10Rows = () => {
    const newRows = Array(10).fill(null).map(() => ({
      action: "",
      table_name: "",
      column_name: "",
      data_type: ""
    }));
    const updated = [...previewData, ...newRows];
    setPreviewData(updated);
    validateData(updated);
  };

  const handleDeleteRow = (index) => {
    const updated = previewData.filter((_, i) => i !== index);
    setPreviewData(updated);
    validateData(updated);
  };

  const persistPendingChanges = (rows) => {
    const existing = JSON.parse(localStorage.getItem("tables") || "[]");
    const newPendingRows = rows.map((row, index) => ({
      id: `${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`,
      action: row.action || "",
      tableName: row.table_name || "",
      columnName: row.column_name || "",
      dataType: row.data_type || "",
      status: "pending",
      approved: false,
      message: row.message || "Pending review",
    }));
    localStorage.setItem("tables", JSON.stringify([...existing, ...newPendingRows]));
  };

  // ── SQL preview ─────────────────────────────────────────────────────────────
  const generateSQL = (data) => {
    const sql = data
      .map((row) => {
        if (row.action === "CREATE_TABLE")
          return `CREATE TABLE ${row.table_name} ();`;
        if (row.action === "ADD_COLUMN")
          return `ALTER TABLE ${row.table_name} ADD COLUMN ${row.column_name} ${row.data_type};`;
        if (row.action === "DROP_COLUMN")
          return `ALTER TABLE ${row.table_name} DROP COLUMN ${row.column_name};`;
        return null;
      })
      .filter(Boolean)
      .join("\n");
    setSqlPreview(sql);
  };
 
  // ── Apply changes ───────────────────────────────────────────────────────────
  const handleApplyChanges = async () => {
    const hasErrors = errors.some((e) => e.length > 0);
    if (hasErrors) {
      alert("Fix validation errors before applying.");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: previewData }),
      });
      const data = await response.json();
      setExecutionResults(data);
      setExecutionHistory((prev) => [
        { time: new Date().toLocaleString(), results: data },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      alert("Failed to apply changes. Is the backend running?");
    }
  };
 
  // ── Load schema ─────────────────────────────────────────────────────────────
  const loadSchema = async () => {
    try {
      const response = await fetch("http://localhost:5000/schema");
      const data = await response.json();
      setSchemaData(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load schema.");
    }
  };
 
  // ── Export report ───────────────────────────────────────────────────────────
  const exportExecutionReport = () => {
    if (previewData.length === 0) {
      alert("No data to export. Add rows or upload a template first.");
      return;
    }

    const reportData = previewData.map((row, index) => ({
      action: row.action,
      table_name: row.table_name,
      column_name: row.column_name,
      data_type: row.data_type,
      status:
        executionResults[index]?.status === "SUCCESS"
          ? "Success"
          : executionResults[index]?.status === "FAILED"
          ? "Failed"
          : "Pending",
      message: executionResults[index]?.error || "Pending review",
    }));

    persistPendingChanges(reportData);

    const headers = Object.keys(reportData[0]).join(",");
    const rows = reportData.map((obj) =>
      Object.values(obj)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "execution_report.csv";
    link.click();

    alert("Exported report and forwarded pending changes to Architect view.");
  };
 
  // ── Derived stats ───────────────────────────────────────────────────────────
  const allResults = executionHistory.flatMap((e) => e.results);
  const successCount = allResults.filter((r) => r.status === "SUCCESS").length;
  const failedCount = allResults.filter((r) => r.status === "FAILED").length;
  const totalChanges = allResults.length;
  const lastExecution = executionHistory.length > 0 ? executionHistory[0].time : "—";
 
  const filteredHistory = executionHistory.filter((entry) =>
    entry.results.some((result) => {
      const matchesSearch = result.table
        ?.toLowerCase()
        .includes(historySearch.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || result.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
  );
  const totalPages = Math.ceil(filteredHistory.length / recordsPerPage);
  const indexOfLast = currentPage * recordsPerPage;
  const currentHistory = filteredHistory.slice(indexOfLast - recordsPerPage, indexOfLast);
 
  // ── Cell highlight ──────────────────────────────────────────────────────────
  const errorCellBg = "#fff5f5";
  const getCellBg = (value) => (!value ? errorCellBg : "transparent");
 
  // ── Common input style ──────────────────────────────────────────────────────
  const inputSx = (value) => ({
    padding: "7px 10px",
    borderRadius: "7px",
    border: `1px solid ${!value ? accent.red : t.inputBorder}`,
    background: getCellBg(value),
    color: t.text,
    width: "100%",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  });
 
  // ── Sidebar nav ─────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "upload", icon: "⬆", label: "Upload Template" },
    { id: "schema", icon: "⬡", label: "Database Schema" },
    { id: "history", icon: "≡", label: "Execution History" },
  ];
 
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        background: t.bg,
        color: t.text,
        transition: "background 0.25s, color 0.25s",
        boxSizing: "border-box",
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          width: "220px",
          flexShrink: 0,
          background: t.sidebar,
          borderRight: `1px solid ${t.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "28px 16px",
          gap: "4px",
        }}
      >
        <div
          style={{
            fontSize: "20px",
            fontWeight: 900,
            letterSpacing: "-0.5px",
            color: accent.blue,
            marginBottom: "28px",
            paddingLeft: "8px",
          }}
        >
          DART
        </div>
 
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              textAlign: "left",
              background:
                activeSection === item.id
                  ? "#eff6ff"
                  : "transparent",
              color:
                activeSection === item.id
                  ? accent.blue
                  : t.textMuted,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <span style={{ fontSize: "16px" }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
 
        <div style={{ flex: 1 }} />
      </div>
 
      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: "30px",
          backgroundColor: t.bg,
          color: t.text,
        }}
      >
 
        {/* Page header */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: t.text,
            }}
          >
            Data Access Repository Tool
          </h1>
          <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: "14px" }}>
            Upload templates, preview SQL, execute schema updates, and track history.
          </p>
        </div>
 
        {/* ── Dashboard section ──────────────────────────────────────────────── */}
        {activeSection === "dashboard" && (
          <div>
            <h2 style={{ marginTop: 0, fontSize: "16px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Overview
            </h2>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "28px" }}>
              <StatCard label="Total Changes" value={totalChanges} color={accent.blue} dark={mode === 'dark'} />
              <StatCard label="Successful" value={successCount} color={accent.green} dark={mode === 'dark'} />
              <StatCard label="Failed" value={failedCount} color={accent.red} dark={mode === 'dark'} />
              <StatCard label="Last Run" value={lastExecution} color={accent.purple} dark={mode === 'dark'} />
            </div>
          </div>
        )}
 
        {/* ── Upload / edit section ─────────────────────────────────────────── */}
        {activeSection === "upload" && (
          <div>
            {/* Upload area */}
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: "14px",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: "15px", fontWeight: 700, color: t.text }}>
                Upload Template
              </h2>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                style={{ fontSize: "13px" }}
              />
              {file && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: accent.green,
                    fontWeight: 600,
                  }}
                >
                  ✓ {file.name} loaded — {previewData.length} rows
                </div>
              )}
            </div>
 
            {/* Action toolbar */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "20px",
                alignItems: "center",
              }}
            >
              <Btn onClick={handleAddRow} variant="primary">+ Add Row</Btn>
              <Btn onClick={handleAdd10Rows} variant="primary">+ Add 10 Rows</Btn>
              <Btn
                onClick={() => setShowConfirm(true)}
                disabled={previewData.length === 0 || errors.some((e) => e.length > 0)}
                variant="primary"
              >
                Apply Changes
              </Btn>
              <Btn onClick={exportExecutionReport} variant="primary">Export Report</Btn>
              <Btn
                onClick={() => {
                  localStorage.removeItem("executionHistory");
                  setExecutionHistory([]);
                }}
                variant="primary"
              >
                Clear History
              </Btn>
            </div>
 
            {/* Data table */}
            {previewData.length > 0 && (
              <div
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: "14px",
                  overflow: "hidden",
                  marginBottom: "20px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: t.tableHead,
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      {["Action", "Table", "Column", "Type", "Errors", "Delete", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "12px 14px",
                              textAlign: "left",
                              fontWeight: 700,
                              fontSize: "12px",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              color: t.textMuted,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr
                        key={index}
                        style={{ borderBottom: `1px solid ${t.border}` }}
                      >
                        {/* Action */}
                        <td style={{ padding: "10px 14px" }}>
                          <select
                            value={row.action || ""}
                            onChange={(e) =>
                              handleCellChange(index, "action", e.target.value)
                            }
                            style={{
                              ...inputSx(row.action),
                              appearance: "none",
                              cursor: "pointer",
                            }}
                          >
                            <option value="">Select…</option>
                            <option value="CREATE_TABLE">CREATE_TABLE</option>
                            <option value="ADD_COLUMN">ADD_COLUMN</option>
                            <option value="DROP_COLUMN">DROP_COLUMN</option>
                          </select>
                        </td>
 
                        {/* Table name */}
                        <td style={{ padding: "10px 14px" }}>
                          <input
                            value={row.table_name || ""}
                            onChange={(e) =>
                              handleCellChange(index, "table_name", e.target.value)
                            }
                            placeholder="table_name"
                            style={inputSx(row.table_name)}
                          />
                        </td>
 
                        {/* Column name */}
                        <td style={{ padding: "10px 14px" }}>
                          <input
                            value={row.column_name || ""}
                            onChange={(e) =>
                              handleCellChange(index, "column_name", e.target.value)
                            }
                            placeholder="column_name"
                            style={inputSx(
                              ["ADD_COLUMN", "DROP_COLUMN"].includes(row.action)
                                ? row.column_name
                                : "ok"
                            )}
                          />
                        </td>
 
                        {/* Data type */}
                        <td style={{ padding: "10px 14px" }}>
                          <input
                            value={row.data_type || ""}
                            onChange={(e) =>
                              handleCellChange(index, "data_type", e.target.value)
                            }
                            placeholder="data_type"
                            style={inputSx(
                              row.action === "ADD_COLUMN" ? row.data_type : "ok"
                            )}
                          />
                        </td>
 
                        {/* Errors */}
                        <td
                          style={{
                            padding: "10px 14px",
                            color: accent.red,
                            fontSize: "12px",
                            maxWidth: "180px",
                          }}
                        >
                          {errors[index]?.join(" · ")}
                        </td>
 
                        {/* Delete */}
                        <td style={{ padding: "10px 14px" }}>
                          <button
                            onClick={() => handleDeleteRow(index)}
                            style={{
                              background: "none",
                              border: `1px solid ${t.border}`,
                              borderRadius: "6px",
                              padding: "5px 10px",
                              cursor: "pointer",
                              color: accent.red,
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            ✕
                          </button>
                        </td>
 
                        {/* Status */}
                        <td style={{ padding: "10px 14px" }}>
                          {executionResults[index] && (
                            <div>
                              <Badge status={executionResults[index].status} />
                              {executionResults[index].error && (
                                <div
                                  style={{
                                    marginTop: "4px",
                                    fontSize: "11px",
                                    color: accent.red,
                                  }}
                                >
                                  {executionResults[index].error}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
 
            {/* SQL preview */}
            {sqlPreview && (
              <div
                style={{
                  background: "#1e1e2e",
                  borderRadius: "12px",
                  padding: "20px 24px",
                  marginTop: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    marginBottom: "10px",
                  }}
                >
                  SQL Preview
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: "13px",
                    color: "#a6e3a1",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {sqlPreview}
                </pre>
              </div>
            )}
          </div>
        )}
 
        {/* ── Schema section ────────────────────────────────────────────────── */}
        {activeSection === "schema" && (
          <div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <Btn onClick={loadSchema} variant="primary">Load Database Schema</Btn>
            </div>
 
            {schemaData.length > 0 ? (
              <div
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: t.tableHead, borderBottom: `1px solid ${t.border}` }}>
                      {["Table", "Column", "Type"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: 700,
                            fontSize: "12px",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            color: t.textMuted,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schemaData.map((row, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: "11px 16px" }}>{row.table_name}</td>
                        <td style={{ padding: "11px 16px" }}>{row.column_name}</td>
                        <td style={{ padding: "11px 16px", color: t.textMuted }}>{row.data_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: t.textMuted }}>Click "Load Database Schema" to fetch schema.</p>
            )}
          </div>
        )}
 
        {/* ── History section ───────────────────────────────────────────────── */}
        {activeSection === "history" && (
          <div>
            {/* Filters */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "18px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="Search by table name…"
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "9px 14px",
                  width: "260px",
                  borderRadius: "8px",
                  border: `1px solid ${t.inputBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontSize: "13px",
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${t.inputBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontSize: "13px",
                }}
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
 
            {executionHistory.length === 0 ? (
              <p style={{ color: t.textMuted }}>No execution history yet.</p>
            ) : (
              <>
                <div
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: "14px",
                    overflow: "hidden",
                    marginBottom: "14px",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: t.tableHead, borderBottom: `1px solid ${t.border}` }}>
                        {["Time", "Table", "Status"].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "12px 16px",
                              textAlign: "left",
                              fontWeight: 700,
                              fontSize: "12px",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              color: t.textMuted,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentHistory.map((entry, i) =>
                        entry.results.map((result, j) => (
                          <tr
                            key={`${i}-${j}`}
                            style={{ borderBottom: `1px solid ${t.border}` }}
                          >
                            <td style={{ padding: "11px 16px", color: t.textMuted, fontSize: "12px" }}>
                              {entry.time}
                            </td>
                            <td style={{ padding: "11px 16px" }}>{result.table}</td>
                            <td style={{ padding: "11px 16px" }}>
                              <Badge status={result.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
 
                {/* Pagination */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <Btn
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    dark={mode === 'dark'}
                  >
                    ← Prev
                  </Btn>
                  <span style={{ fontSize: "13px", color: t.textMuted }}>
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <Btn
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    dark={mode === 'dark'}
                  >
                    Next →
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}
      </div>
 
      {/* ── Confirm modal ──────────────────────────────────────────────────────── */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              padding: "32px",
              borderRadius: "16px",
              width: "420px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 800, color: t.text }}>
              Confirm Schema Changes
            </h3>
            <p style={{ color: t.textMuted, margin: "0 0 24px", fontSize: "14px" }}>
              You are about to apply {previewData.length} change
              {previewData.length !== 1 ? "s" : ""} to the database. This action may be irreversible.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowConfirm(false)} dark={mode === 'dark'}>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  handleApplyChanges();
                  setShowConfirm(false);
                }}
              >
                Yes, Apply
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
export default DataModelForm;
