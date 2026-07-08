import { useState, useEffect, useContext, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ThemeContext } from "../App";

const tokens = {
  light: {
    bg: "#f0f2f5",
    surface: "#ffffff",
    surfaceAlt: "#f8f9fb",
    border: "#e4e7ec",
    text: "#111827",
    textMuted: "#6b7280",
    inputBorder: "#d1d5db",
    inputBg: "#ffffff",
    panelBg: "#e3f2fd",
  },
  dark: {
    bg: "#0f1117",
    surface: "#1a1d27",
    surfaceAlt: "#22263a",
    border: "#2d3148",
    text: "#e5e7eb",
    textMuted: "#9ca3af",
    inputBorder: "#374151",
    inputBg: "#1f2330",
    panelBg: "#0d47a1",
  },
};

const accent = {
  blue: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
  purple: "#8b5cf6",
  amber: "#f59e0b",
};

const standardDataTypes = [
  "VARCHAR(255)",
  "VARCHAR(50)",
  "VARCHAR(100)",
  "VARCHAR(MAX)",
  "INTEGER",
  "BIGINT",
  "NUMERIC(18,2)",
  "BOOLEAN",
  "DATE",
  "TIMESTAMP",
  "TEXT"
];

function Btn({ children, onClick, disabled, variant = "default", style: extra }) {
  const base = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: "12px",
    transition: "opacity 0.15s",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
  };
  const variants = {
    default: { background: "#f3f4f6", color: "#374151" },
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

function DataModelFormNew() {
  const { mode } = useContext(ThemeContext);
  const t = mode === 'dark' ? tokens.dark : tokens.light;

  // Role management
  const userRole = localStorage.getItem("userRole") || "developer";
  const isArchitect = userRole === "architect";

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // URL search params for routing / notifications
  const [searchParams, setSearchParams] = useSearchParams();
  const querySubmissionId = searchParams.get("submissionId");
  const queryTableName = searchParams.get("tableName");

  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [dbTables, setDbTables] = useState([]);

  const loadDbTables = async () => {
    try {
      const res = await fetch("https://prad-proj1.onrender.com/schema");
      if (res.ok) {
        const data = await res.json();
        // Extract unique table names and convert to lowercase
        const names = [...new Set(data.map(row => row.table_name?.toLowerCase()))].filter(Boolean);
        setDbTables(names);
      }
    } catch (err) {
      console.error("Failed to load schema from database", err);
    }
  };

  const checkTableExists = (tableName) => {
    if (!tableName) return false;
    const name = tableName.trim().toLowerCase();
    
    // Check database tables first
    if (dbTables.includes(name)) return true;
    
    // Fallback to localStorage tables
    const approvedTables = JSON.parse(localStorage.getItem("tables") || "[]");
    return approvedTables.some(t => {
      const tName = t.tableName || t.name;
      return tName && tName.trim().toLowerCase() === name;
    });
  };

  useEffect(() => {
    loadDbTables();
  }, []);

  // Form states
  const [tableData, setTableData] = useState({
    tableName: "",
    entityLogicalName: "",
    distributionStyle: "",
    verticalName: "",
  });

  const [dataProductData, setDataProductData] = useState({
    dataProduct: "",
    productTier: "",
    dataSteward: "",
    productOwner: "",
    aiEnabled: "N",
  });

  const [columns, setColumns] = useState([]);
  const [sqlPreview, setSqlPreview] = useState("");

  // Refs to prevent recursive auto-saving and auto-loading loops
  const isStateLoadingRef = useRef(false);
  const lastLoadedTableRef = useRef("");

  // Mapping between attribute words and column abbreviations
  const wordToAbbrev = {
    employee: 'Emp',
    sales: 'Sls',
    identifier: 'Id',
    salary: 'Salry',
    date: 'Dt',
    join: 'Join',
    name: 'Nm',
    month: 'Mth',
    calendar: 'Cal',
    dimension: 'Dim',
    fact: 'Fct',
    cancel: 'Cncl',
    connect: 'Conn',
    department: 'Dept',
    'surrogate key': 'SK',
    'primary key': 'Pk',
  };

  const abbrevToWord = Object.fromEntries(Object.entries(wordToAbbrev).map(([k,v]) => [v.toLowerCase(), k]));

  const splitWords = (s) => {
    if (!s) return [];
    return s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  };

  const generateColumnName = (attr) => {
    const words = splitWords(attr);
    if (words.length === 0) return '';
    return words
      .map((w) => {
        const key = w.toLowerCase();
        if (wordToAbbrev[key]) return wordToAbbrev[key];
        return w.slice(0, 3).replace(/[^a-zA-Z0-9]/g, '');
      })
      .join('');
  };

  const generateAttributeName = (col) => {
    if (!col) return '';
    const parts = col.split(/[_\s]+|(?=[A-Z][a-z])|(?=[A-Z]{2,})/).filter(Boolean);
    if (parts.length === 0) return '';
    return parts
      .map((p) => {
        const lower = p.toLowerCase();
        if (abbrevToWord[lower]) return abbrevToWord[lower];
        const up = p.charAt(0).toUpperCase() + p.slice(1);
        if (abbrevToWord[up.toLowerCase()]) return abbrevToWord[up.toLowerCase()];
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Load pending submissions list (for Architect selector)
  const refreshSubmissions = () => {
    const subs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
    setPendingSubmissions(subs.filter(s => s.status === "pending"));
  };

  useEffect(() => {
    refreshSubmissions();
    const handleStorage = () => {
      refreshSubmissions();
      loadDbTables();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Handle URL query parameter ?submissionId=sub_xxx
  useEffect(() => {
    if (querySubmissionId) {
      const subs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
      const sub = subs.find(s => s.id === querySubmissionId);
      if (sub && sub.status === "pending") {
        isStateLoadingRef.current = true;
        setSelectedSubmissionId(querySubmissionId);
        setTableData(sub.tableData);
        if (sub.dataProductData) setDataProductData(sub.dataProductData);
        if (sub.columns) setColumns(sub.columns);
        lastLoadedTableRef.current = sub.tableName;
        showToast(`Loaded pending submission for table "${sub.tableName}"`);
        setTimeout(() => { isStateLoadingRef.current = false; }, 100);
      }
    }
  }, [querySubmissionId]);

  // Handle URL query parameter ?tableName=xxx
  useEffect(() => {
    if (queryTableName) {
      setTableData(prev => ({ ...prev, tableName: queryTableName }));
    }
  }, [queryTableName]);

  // AUTO-LOAD: Watch Table Name field and load drafts/approved schemas dynamically
  useEffect(() => {
    const name = tableData.tableName ? tableData.tableName.trim() : "";
    if (!name || name === lastLoadedTableRef.current) return;

    // 0. Look for pending submission in schemaSubmissions first (contains architect's edits)
    const subs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
    const pendingSub = subs.find(s => s.tableName.toLowerCase() === name.toLowerCase() && s.status === "pending");
    if (pendingSub) {
      isStateLoadingRef.current = true;
      setSelectedSubmissionId(pendingSub.id);
      setTableData({ ...pendingSub.tableData, tableName: tableData.tableName });
      if (pendingSub.dataProductData) setDataProductData(pendingSub.dataProductData);
      if (pendingSub.columns) setColumns(pendingSub.columns);
      lastLoadedTableRef.current = name;
      showToast(`Loaded pending submission for table "${name}"`);
      setTimeout(() => { isStateLoadingRef.current = false; }, 100);
      return;
    }

    // 1. Look for draft first
    const savedDraft = localStorage.getItem(`schemaDrafts_${name}`);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        isStateLoadingRef.current = true;
        setTableData({ ...draft.tableData, tableName: tableData.tableName });
        if (draft.dataProductData) setDataProductData(draft.dataProductData);
        if (draft.columns) setColumns(draft.columns);
        lastLoadedTableRef.current = name;
        showToast(`Auto-loaded saved draft for table "${name}"`);
        setTimeout(() => { isStateLoadingRef.current = false; }, 100);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Look for existing approved tables in legacy tables list
    const approvedTables = JSON.parse(localStorage.getItem("tables") || "[]");
    const found = approvedTables.find(t => t.tableName && t.tableName.trim().toLowerCase() === name.toLowerCase());
    if (found && found.columns) {
      isStateLoadingRef.current = true;
      setTableData(found.tableData || {
        tableName: found.tableName,
        entityLogicalName: found.entityLogicalName || found.tableDefinition || "",
        distributionStyle: found.distributionStyle || "",
        verticalName: found.verticalName || "",
      });
      if (found.dataProductData) setDataProductData(found.dataProductData);
      setColumns(found.columns);
      lastLoadedTableRef.current = name;
      showToast(`Loaded existing database schema for "${found.tableName}"`);
      setTimeout(() => { isStateLoadingRef.current = false; }, 100);
    }
  }, [tableData.tableName]);

  // AUTO-SAVE: Automatically save edits to drafts (for Developer view)
  useEffect(() => {
    if (isArchitect) return;
    if (isStateLoadingRef.current) return;

    const name = tableData.tableName ? tableData.tableName.trim() : "";
    if (name) {
      const draft = { tableData, dataProductData, columns };
      localStorage.setItem(`schemaDrafts_${name}`, JSON.stringify(draft));
    }
  }, [tableData, dataProductData, columns, isArchitect]);

  // REAL-TIME SYNC: Listen to storage events to reload pending submission when updated by Architect
  useEffect(() => {
    if (isArchitect) return;

    const handleStorageChange = () => {
      const name = tableData.tableName ? tableData.tableName.trim() : "";
      if (!name) return;

      const subs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
      const currentSub = selectedSubmissionId 
        ? subs.find(s => s.id === selectedSubmissionId)
        : subs.find(s => s.tableName.toLowerCase() === name.toLowerCase() && s.status === "pending");

      if (currentSub && currentSub.status === "pending") {
        const isDifferent =
          JSON.stringify(currentSub.tableData) !== JSON.stringify(tableData) ||
          JSON.stringify(currentSub.dataProductData) !== JSON.stringify(dataProductData) ||
          JSON.stringify(currentSub.columns) !== JSON.stringify(columns);

        if (isDifferent) {
          isStateLoadingRef.current = true;
          setTableData(currentSub.tableData);
          if (currentSub.dataProductData) setDataProductData(currentSub.dataProductData);
          if (currentSub.columns) setColumns(currentSub.columns);
          if (!selectedSubmissionId) setSelectedSubmissionId(currentSub.id);
          lastLoadedTableRef.current = currentSub.tableName;
          showToast(`Developer view updated with Architect's latest edits for "${currentSub.tableName}"`, "info");
          setTimeout(() => {
            isStateLoadingRef.current = false;
          }, 100);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [tableData, dataProductData, columns, isArchitect, selectedSubmissionId]);

  // DDL generator
  useEffect(() => {
    if (tableData.tableName && columns.length > 0) {
      const isExisting = checkTableExists(tableData.tableName);

      if (isExisting) {
        const addedCols = columns.filter(col => col.action === "Add" && col.columnName);
        if (addedCols.length > 0) {
          const sql = addedCols.map(col => {
            let line = `ALTER TABLE ${tableData.tableName} ADD COLUMN ${col.columnName} ${col.dataType || 'VARCHAR(255)'}`;
            if (col.isNotNull === 'Y') line += ' NOT NULL';
            if (col.primaryIndex === 'Y') line += ' PRIMARY KEY';
            return line + ';';
          }).join('\n');
          setSqlPreview(sql);
        } else {
          setSqlPreview("-- No new columns to add (select 'Add' as Action to add new columns)");
        }
      } else {
        let sql = `CREATE TABLE ${tableData.tableName} (\n`;
        sql += columns.map((col) => {
          let line = `  ${col.columnName || 'col'} ${col.dataType || 'VARCHAR(255)'}`;
          if (col.isNotNull === 'Y') line += ' NOT NULL';
          if (col.primaryIndex === 'Y') line += ' PRIMARY KEY';
          return line;
        }).join(',\n');
        sql += '\n);';
        setSqlPreview(sql);
      }
    } else {
      setSqlPreview("");
    }
  }, [tableData.tableName, columns, dbTables]);

  const handleTableChange = (field, value) => {
    setTableData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "tableName") {
        updated.entityLogicalName = generateAttributeName(value);
      }
      return updated;
    });
  };

  const handleProductChange = (field, value) => {
    setDataProductData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddColumn = () => {
    const isExisting = checkTableExists(tableData.tableName);

    const newColumn = {
      attributeName: "",
      columnName: "",
      action: isExisting ? "Add" : "No Change",
      dataDomain: "",
      dataClassification: "",
      dataType: "",
      isNotNull: "",
      primaryIndex: "",
      attributeDefinition: "",
      hasStats: "",
      defaultValue: "",
    };
    setColumns([...columns, newColumn]);
  };

  const handleAddColumns = (count) => {
    const isExisting = checkTableExists(tableData.tableName);

    const newColumns = Array(count).fill(null).map(() => ({
      attributeName: "",
      columnName: "",
      action: isExisting ? "Add" : "No Change",
      dataDomain: "",
      dataClassification: "",
      dataType: "",
      isNotNull: "",
      primaryIndex: "",
      attributeDefinition: "",
      hasStats: "",
      defaultValue: "",
    }));
    setColumns([...columns, ...newColumns]);
  };

  const handleColumnChange = (index, field, value) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'attributeName') {
      updated[index].columnName = generateColumnName(value);
    }

    if (field === 'columnName') {
      const generatedAttr = generateAttributeName(value);
      updated[index].attributeName = generatedAttr;
    }

    setColumns(updated);
  };

  const handleDeleteColumn = (index) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const generateSQL = () => {
    if (!tableData.tableName) {
      showToast("Please enter a table name", "error");
      return;
    }
    if (columns.length === 0) {
      showToast("Please add columns to generate SQL", "error");
      return;
    }
    // SQL generation is already handled by useEffect, we show feedback
    showToast("DDL SQL generated below");
  };

  const [showSavedPopup, setShowSavedPopup] = useState(false);

  // Developer actions
  const handleResetForm = () => {
    setTableData({ tableName: "", entityLogicalName: "", distributionStyle: "", verticalName: "" });
    setDataProductData({ dataProduct: "", productTier: "", dataSteward: "", productOwner: "", aiEnabled: "N" });
    setColumns([]);
    setSqlPreview("");
    lastLoadedTableRef.current = "";
    showToast("Form cleared", "info");
  };

  const handleApplyChanges = () => {
    if (!tableData.tableName.trim()) {
      showToast("Please enter a Table Name before applying changes", "error");
      return;
    }
    if (columns.length === 0) {
      showToast("Please add at least one column before applying changes", "error");
      return;
    }

    const name = tableData.tableName.trim();

    // 1. Save draft locally
    const draft = { tableData, dataProductData, columns };
    localStorage.setItem(`schemaDrafts_${name}`, JSON.stringify(draft));

    // 2. Submit to Architect
    const submissionId = `sub_${Date.now()}`;
    const newSubmission = {
      id: submissionId,
      tableName: name,
      tableData,
      dataProductData,
      columns,
      status: "pending",
      submittedAt: new Date().toISOString(),
      submittedBy: "Developer",
      editedByArchitect: false
    };

    const existing = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
    const filtered = existing.filter(s => !(s.tableName.toLowerCase() === name.toLowerCase() && s.status === 'pending'));

    localStorage.setItem("schemaSubmissions", JSON.stringify([...filtered, newSubmission]));
    window.dispatchEvent(new Event("storage")); // Trigger Layout update

    // 3. Show Popup
    setShowSavedPopup(true);
  };

  const handleExportReport = () => {
    if (!tableData.tableName.trim()) {
      showToast("Please enter a Table Name to export report", "error");
      return;
    }
    if (columns.length === 0) {
      showToast("Please add columns to export report", "error");
      return;
    }

    const name = tableData.tableName.trim();
    let csvContent = "Attribute Name,Column Name,Action,Data Domain,Data Classification,Data Type,Is Not Null,Primary Index,Attribute Definition,Has Stats,Default Value\n";

    columns.forEach((col) => {
      const row = [
        col.attributeName || "",
        col.columnName || "",
        col.action || "No Change",
        col.dataDomain || "",
        col.dataClassification || "",
        col.dataType || "",
        col.isNotNull || "",
        col.primaryIndex || "",
        col.attributeDefinition || "",
        col.hasStats || "",
        col.defaultValue || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${name}_schema_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Report exported successfully!");
  };

  // Architect actions
  const handleSaveEdits = () => {
    if (!selectedSubmissionId) return;
    const subs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
    const updated = subs.map(s => {
      if (s.id === selectedSubmissionId) {
        const name = tableData.tableName.trim();
        // Update/sync the developer draft with architect's current edits
        const draft = { tableData, dataProductData, columns };
        localStorage.setItem(`schemaDrafts_${name}`, JSON.stringify(draft));

        return {
          ...s,
          tableName: name,
          tableData,
          dataProductData,
          columns,
          editedByArchitect: true,
          architectLastEditedAt: new Date().toISOString()
        };
      }
      return s;
    });
    localStorage.setItem("schemaSubmissions", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    showToast("Review edits saved successfully");
  };

  const handleReject = () => {
    if (!selectedSubmissionId) return;
    const subs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
    const updated = subs.map(s => {
      if (s.id === selectedSubmissionId) {
        return { ...s, status: "rejected" };
      }
      return s;
    });
    localStorage.setItem("schemaSubmissions", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));

    setSearchParams({});
    setSelectedSubmissionId("");
    handleResetForm();
    showToast("Submission rejected", "error");
  };

  const handleApproveAndApply = async () => {
    if (!tableData.tableName.trim()) {
      showToast("Table Name cannot be empty", "error");
      return;
    }

    const isExisting = checkTableExists(tableData.tableName);

    const template = [];
    if (!isExisting) {
      template.push({ action: "CREATE_TABLE", table_name: tableData.tableName });
      columns.forEach(col => {
        if (col.columnName) {
          template.push({
            action: "ADD_COLUMN",
            table_name: tableData.tableName,
            column_name: col.columnName,
            data_type: col.dataType || "VARCHAR(255)"
          });
        }
      });
    } else {
      columns.forEach(col => {
        if (col.columnName && col.action === "Add") {
          template.push({
            action: "ADD_COLUMN",
            table_name: tableData.tableName,
            column_name: col.columnName,
            data_type: col.dataType || "VARCHAR(255)"
          });
        }
      });
    }

    try {
      showToast("Applying approved schema changes to PostgreSQL database...", "info");
      const response = await fetch("https://prad-proj1.onrender.com/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const data = await response.json();

      const failedStep = data.find(step => step.status === "FAILED");
      if (failedStep) {
        showToast(`Backend error: ${failedStep.error}`, "error");
        return;
      }

      if (selectedSubmissionId) {
        const subs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
        const updated = subs.map(s => {
          if (s.id === selectedSubmissionId) {
            return { ...s, status: "approved" };
          }
          return s;
        });
        localStorage.setItem("schemaSubmissions", JSON.stringify(updated));
      }

      const approvedTable = {
        id: Date.now(),
        tableName: tableData.tableName,
        verticalName: tableData.verticalName || "",
        tableDefinition: tableData.entityLogicalName || "Approved rich schema",
        status: "approved",
        approved: true,
        tableData,
        dataProductData,
        columns
      };

      const tables = JSON.parse(localStorage.getItem("tables") || "[]");
      const filteredTables = tables.filter(t => t.tableName.toLowerCase() !== tableData.tableName.toLowerCase());
      localStorage.setItem("tables", JSON.stringify([...filteredTables, approvedTable]));

      // Also update/sync the developer draft with the final approved/edited data!
      const name = tableData.tableName.trim();
      const draft = { tableData, dataProductData, columns };
      localStorage.setItem(`schemaDrafts_${name}`, JSON.stringify(draft));

      window.dispatchEvent(new Event("storage"));

      setSearchParams({});
      setSelectedSubmissionId("");
      showToast("Schema approved and applied to database!");
      loadDbTables();
    } catch (err) {
      console.error(err);
      showToast("Failed to apply changes. Is backend running?", "error");
    }
  };
  const getIsEditedByArchitect = () => {
    if (isArchitect) return false;
    const name = tableData.tableName ? tableData.tableName.trim() : "";
    if (!name) return false;
    
    const subs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
    const currentSub = selectedSubmissionId 
      ? subs.find(s => s.id === selectedSubmissionId)
      : subs.find(s => s.tableName.toLowerCase() === name.toLowerCase() && s.status === "pending");
      
    return currentSub ? !!currentSub.editedByArchitect : false;
  };
  
  const isEditedByArchitect = getIsEditedByArchitect();

  return (
    <div style={{ padding: "30px", backgroundColor: t.bg, color: t.text, minHeight: "100vh" }}>
      
      {/* Toast alert */}
      {toast.show && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          padding: "12px 24px",
          borderRadius: "8px",
          background: toast.type === "error" ? accent.red : toast.type === "info" ? accent.blue : accent.green,
          color: "#fff",
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          transition: "all 0.2s"
        }}>
          <span>{toast.type === "error" ? "⚠️" : toast.type === "info" ? "ℹ️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Selector banner for Architect */}
      {isArchitect && (
        <div style={{
          background: t.panelBg,
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
          border: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: "15px",
          justifyContent: "space-between",
          color: mode === 'dark' ? '#fff' : '#000'
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>📋 Pending Architect Reviews:</span>
            <select
              value={selectedSubmissionId}
              onChange={(e) => {
                const subId = e.target.value;
                setSelectedSubmissionId(subId);
                if (subId) {
                  setSearchParams({ submissionId: subId });
                } else {
                  setSearchParams({});
                  handleResetForm();
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: `1px solid ${t.border}`,
                background: t.surface,
                color: t.text,
                fontSize: "13px",
                width: "280px",
                outline: "none"
              }}
            >
              <option value="">Select a submission to review...</option>
              {pendingSubmissions.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.tableName} (by {sub.submittedBy})
                </option>
              ))}
            </select>
          </div>
          {selectedSubmissionId && (
            <div style={{ fontSize: "12px", background: accent.amber, color: "#000", padding: "4px 10px", borderRadius: "4px", fontWeight: "bold" }}>
              Architect Review Mode
            </div>
          )}
        </div>
      )}

      {/* Selector banner for Developer showing Architect edits */}
      {!isArchitect && isEditedByArchitect && (
        <div style={{
          background: mode === 'dark' ? '#2e261f' : '#fef3c7',
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
          border: `1px solid ${accent.amber}`,
          display: "flex",
          alignItems: "center",
          gap: "15px",
          justifyContent: "space-between",
          color: mode === 'dark' ? '#fde68a' : '#92400e',
          boxShadow: "0 2px 8px rgba(245, 158, 11, 0.15)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>💡</span>
            <div>
              <span style={{ fontSize: "14px", fontWeight: "bold", display: "block" }}>
                Architect Edits Applied
              </span>
              <span style={{ fontSize: "12px", opacity: 0.9 }}>
                The Architect has reviewed and edited this schema. The changes are now visible below.
              </span>
            </div>
          </div>
          <div style={{ 
            fontSize: "11px", 
            background: accent.amber, 
            color: "#000", 
            padding: "4px 10px", 
            borderRadius: "4px", 
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            Architect Reviewed
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>
          {isArchitect ? "Architect Review Console" : "Data Model Form (Developer View)"}
        </h1>
        <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "6px" }}>
          {isArchitect 
            ? "Inspect, modify, approve, or reject Developer schema designs."
            : "Define table-level details and columns. Edits are auto-saved by table name."}
        </p>
      </div>

      {/* Three-column layout */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
        
        {/* Left Panel - Table Level Details */}
        <div style={{
          flex: "0 0 280px",
          background: t.panelBg,
          borderRadius: "8px",
          padding: "16px",
          border: `1px solid ${t.border}`,
        }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: mode === 'dark' ? '#ffffff' : '#0f172a' }}>
            TABLE LEVEL DETAILS
          </h3>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>
              Table Name
            </label>
            <input
              type="text"
              value={tableData.tableName}
              onChange={(e) => handleTableChange("tableName", e.target.value)}
              placeholder="Enter table name"
              style={{
                width: "100%",
                padding: "6px 8px",
                marginTop: "4px",
                border: `1px solid ${t.inputBorder}`,
                borderRadius: "4px",
                fontSize: "12px",
                background: t.inputBg,
                color: t.text,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>
              Entity Logical Name
            </label>
            <input
              type="text"
              value={tableData.entityLogicalName}
              onChange={(e) => handleTableChange("entityLogicalName", e.target.value)}
              placeholder="Enter logical name"
              style={{
                width: "100%",
                padding: "6px 8px",
                marginTop: "4px",
                border: `1px solid ${t.inputBorder}`,
                borderRadius: "4px",
                fontSize: "12px",
                background: t.inputBg,
                color: t.text,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>
              Distribution Style
            </label>
            <select
              value={tableData.distributionStyle}
              onChange={(e) => handleTableChange("distributionStyle", e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                marginTop: "4px",
                border: `1px solid ${t.inputBorder}`,
                borderRadius: "4px",
                fontSize: "12px",
                background: t.inputBg,
                color: t.text,
                boxSizing: "border-box",
              }}
            >
              <option value="">Select style</option>
              <option value="AUTO">AUTO</option>
              <option value="EVEN">EVEN</option>
              <option value="KEY">KEY</option>
              <option value="ALL">ALL</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>
              Vertical Name
            </label>
            <input
              type="text"
              value={tableData.verticalName}
              onChange={(e) => handleTableChange("verticalName", e.target.value)}
              placeholder="Enter vertical"
              style={{
                width: "100%",
                padding: "6px 8px",
                marginTop: "4px",
                border: `1px solid ${t.inputBorder}`,
                borderRadius: "4px",
                fontSize: "12px",
                background: t.inputBg,
                color: t.text,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexDirection: "column" }}>
            <Btn onClick={() => handleAddColumns(10)} variant="primary" style={{ width: "100%", textAlign: "center" }}>
              + Add 10 Rows
            </Btn>
            <Btn onClick={handleAddColumn} variant="primary" style={{ width: "100%", textAlign: "center" }}>
              Add Column
            </Btn>
          </div>
        </div>

        {/* Center Panel - Table Definition (Dynamic Preview) */}
        <div style={{
          flex: "1",
          background: t.surface,
          borderRadius: "8px",
          padding: "16px",
          border: `1px solid ${t.border}`,
        }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: t.text }}>
            TABLE DEFINITION PREVIEW
          </h3>

          <div style={{ fontSize: "12px", color: t.text, lineHeight: 1.6 }}>
            <div><strong>Logical:</strong> {tableData.entityLogicalName || "(not set)"}</div>
            <div style={{ marginTop: "8px", padding: "12px", background: t.bg, borderRadius: "6px" }}>
              <div><strong>Table Physical Name:</strong> {tableData.tableName || "(not set)"}</div>
              <div style={{ marginTop: "4px" }}><strong>Distribution:</strong> {tableData.distributionStyle || "(not set)"}</div>
              <div style={{ marginTop: "4px" }}><strong>Vertical:</strong> {tableData.verticalName || "(not set)"}</div>
              <div style={{ marginTop: "4px", color: accent.blue }}><strong>Columns:</strong> {columns.length} defined</div>
            </div>
          </div>
        </div>

        {/* Right Panel - Data Product Details (Fully Interactive) */}
        <div style={{
          flex: "0 0 240px",
          background: t.panelBg,
          borderRadius: "8px",
          padding: "16px",
          border: `1px solid ${t.border}`,
        }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: mode === 'dark' ? '#ffffff' : '#0f172a' }}>
            DATA PRODUCT DETAILS
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>Data Product</label>
              <input
                type="text"
                value={dataProductData.dataProduct || ""}
                onChange={(e) => handleProductChange("dataProduct", e.target.value)}
                placeholder="Product Details"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  marginTop: "4px",
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: "4px",
                  fontSize: "12px",
                  background: t.inputBg,
                  color: t.text,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>Product Tier</label>
              <input
                type="text"
                value={dataProductData.productTier || ""}
                onChange={(e) => handleProductChange("productTier", e.target.value)}
                placeholder="Tier (e.g. N)"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  marginTop: "4px",
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: "4px",
                  fontSize: "12px",
                  background: t.inputBg,
                  color: t.text,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>Data Steward</label>
              <input
                type="text"
                value={dataProductData.dataSteward || ""}
                onChange={(e) => handleProductChange("dataSteward", e.target.value)}
                placeholder="Steward Name"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  marginTop: "4px",
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: "4px",
                  fontSize: "12px",
                  background: t.inputBg,
                  color: t.text,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>Product Owner</label>
              <input
                type="text"
                value={dataProductData.productOwner || ""}
                onChange={(e) => handleProductChange("productOwner", e.target.value)}
                placeholder="Owner Name"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  marginTop: "4px",
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: "4px",
                  fontSize: "12px",
                  background: t.inputBg,
                  color: t.text,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted }}>AI Enabled</label>
              <select
                value={dataProductData.aiEnabled || "N"}
                onChange={(e) => handleProductChange("aiEnabled", e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  marginTop: "4px",
                  border: `1px solid ${t.inputBorder}`,
                  borderRadius: "4px",
                  fontSize: "12px",
                  background: t.inputBg,
                  color: t.text,
                  boxSizing: "border-box",
                }}
              >
                <option value="N">No (N)</option>
                <option value="Y">Yes (Y)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Column Level Details */}
      <div style={{
        background: t.surface,
        borderRadius: "8px",
        border: `1px solid ${t.border}`,
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px", borderBottom: `1px solid ${t.border}` }}>
          <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: t.text }}>
            COLUMN LEVEL DETAILS
          </h3>
        </div>

        {columns.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: mode === 'dark' ? "#2d3148" : "#f3f4f6", color: t.text }}>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Attribute Name</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Column Name</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Action</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Data Domain</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Data Classification</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Data Type</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Is Not Null</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Primary Index</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Attribute Definition</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Has Stats</th>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${t.border}` }}>Default Value</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}` }}>
                      <input
                        type="text"
                        value={col.attributeName}
                        onChange={(e) => handleColumnChange(index, "attributeName", e.target.value)}
                        placeholder="Attr"
                        style={{ width: "100%", padding: "4px", fontSize: "11px", border: `1px solid ${t.border}`, borderRadius: "3px", background: t.inputBg, color: t.text }}
                      />
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}` }}>
                      <input
                        type="text"
                        value={col.columnName}
                        onChange={(e) => handleColumnChange(index, "columnName", e.target.value)}
                        placeholder="Col"
                        style={{ width: "100%", padding: "4px", fontSize: "11px", border: `1px solid ${t.border}`, borderRadius: "3px", background: t.inputBg, color: t.text }}
                      />
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}` }}>
                      <select
                        value={col.action}
                        onChange={(e) => handleColumnChange(index, "action", e.target.value)}
                        style={{ width: "100%", padding: "4px", fontSize: "11px", border: `1px solid ${t.border}`, borderRadius: "3px", background: t.inputBg, color: t.text }}
                      >
                        <option>No Change</option>
                        <option>Add</option>
                        <option>Audit Columns</option>
                      </select>
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}` }}>
                      <input
                        type="text"
                        value={col.dataDomain}
                        onChange={(e) => handleColumnChange(index, "dataDomain", e.target.value)}
                        placeholder="Domain"
                        style={{ width: "100%", padding: "4px", fontSize: "11px", border: `1px solid ${t.border}`, borderRadius: "3px", background: t.inputBg, color: t.text }}
                      />
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}` }}>
                      <input
                        type="text"
                        value={col.dataClassification}
                        onChange={(e) => handleColumnChange(index, "dataClassification", e.target.value)}
                        placeholder="Class"
                        style={{ width: "100%", padding: "4px", fontSize: "11px", border: `1px solid ${t.border}`, borderRadius: "3px", background: t.inputBg, color: t.text }}
                      />
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}` }}>
                      <select
                        value={col.dataType || ""}
                        onChange={(e) => handleColumnChange(index, "dataType", e.target.value)}
                        style={{ width: "100%", padding: "4px", fontSize: "11px", border: `1px solid ${t.border}`, borderRadius: "3px", background: t.inputBg, color: t.text }}
                      >
                        <option value="">Select Type</option>
                        {standardDataTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                        {col.dataType && !standardDataTypes.includes(col.dataType) && (
                          <option value={col.dataType}>{col.dataType}</option>
                        )}
                      </select>
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}`, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={col.isNotNull === 'Y'}
                        onChange={(e) => handleColumnChange(index, "isNotNull", e.target.checked ? 'Y' : '')}
                      />
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}`, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={col.primaryIndex === 'Y'}
                        onChange={(e) => handleColumnChange(index, "primaryIndex", e.target.checked ? 'Y' : '')}
                      />
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}` }}>
                      <input
                        type="text"
                        value={col.attributeDefinition}
                        onChange={(e) => handleColumnChange(index, "attributeDefinition", e.target.value)}
                        placeholder="Def"
                        style={{ width: "100%", padding: "4px", fontSize: "11px", border: `1px solid ${t.border}`, borderRadius: "3px", background: t.inputBg, color: t.text }}
                      />
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}`, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={col.hasStats === 'Y'}
                        onChange={(e) => handleColumnChange(index, "hasStats", e.target.checked ? 'Y' : '')}
                      />
                    </td>
                    <td style={{ padding: "8px", borderRight: `1px solid ${t.border}` }}>
                      <input
                        type="text"
                        value={col.defaultValue}
                        onChange={(e) => handleColumnChange(index, "defaultValue", e.target.value)}
                        placeholder="Default"
                        style={{ width: "100%", padding: "4px", fontSize: "11px", border: `1px solid ${t.border}`, borderRadius: "3px", background: t.inputBg, color: t.text }}
                      />
                    </td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <button
                        onClick={() => handleDeleteColumn(index)}
                        style={{
                          background: "none",
                          border: "none",
                          color: accent.red,
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "16px", textAlign: "center", color: t.textMuted }}>
            No columns added yet. Click "+ Add 10 Rows" or "Add Column" to get started.
          </div>
        )}
      </div>

      {/* Action buttons at bottom */}
      <div style={{ marginTop: "20px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        
        {/* Common button: Generate SQL */}
        <Btn onClick={generateSQL} variant="primary">Generate SQL</Btn>
        
        {/* Role-specific buttons */}
        {!isArchitect ? (
          <>
            <Btn onClick={handleApplyChanges} variant="primary">Apply Changes</Btn>
            <Btn onClick={handleExportReport} variant="primary">Export Report</Btn>
          </>
        ) : (
          <>
            {selectedSubmissionId && (
              <>
                <Btn onClick={handleApproveAndApply} variant="success">Approve & Apply DDL</Btn>
                <Btn onClick={handleReject} variant="danger">Reject Submission</Btn>
                <Btn onClick={handleSaveEdits} variant="primary">Save Edits</Btn>
              </>
            )}
            <Btn onClick={handleResetForm} variant="danger">Reset Console</Btn>
          </>
        )}
      </div>

      {/* DDL Preview below column details */}
      <div style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: t.text }}>
          Generated DDL
        </h3>
        <div style={{
          background: mode === 'dark' ? '#1e1e2e' : '#fff',
          borderRadius: "8px",
          padding: "16px",
          border: `1px solid ${t.border}`,
          minHeight: "120px",
          color: mode === 'dark' ? '#a6e3a1' : '#0f172a',
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: "12px",
        }}>
          {sqlPreview ? sqlPreview : "DDL table SQL will automatically display here once you type a table name and add columns."}
        </div>
      </div>

      {/* Saved Success Modal/Popup */}
      {showSavedPopup && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: "12px",
            padding: "24px",
            width: "380px",
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#d1fae5",
              color: accent.green,
              fontSize: "28px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 16px auto"
            }}>
              ✓
            </div>
            <h3 style={{
              margin: "0 0 8px 0",
              color: t.text,
              fontSize: "18px",
              fontWeight: 700
            }}>
              Changes Applied & Saved
            </h3>
            <p style={{
              margin: "0 0 20px 0",
              color: t.textMuted,
              fontSize: "13px",
              lineHeight: 1.5
            }}>
              Table level and column details for <strong>{tableData.tableName}</strong> have been saved as a draft and forwarded to the Architect for review.
            </p>
            <Btn
              onClick={() => setShowSavedPopup(false)}
              variant="primary"
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "13px",
                fontWeight: "bold",
                borderRadius: "6px"
              }}
            >
              OK
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataModelFormNew;
