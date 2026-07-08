import { useState, useEffect, useContext } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FaServer, FaDatabase, FaChartBar, FaBell } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { ThemeContext } from "./App";
import Papa from "papaparse";
import ExcelJS from "exceljs";

function Layout({ onLogout }) {
  const muiTheme = useTheme();
  const { mode, toggleTheme } = useContext(ThemeContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [cluster, setCluster] = useState("dev-redshift-cluster");
  const [schema, setSchema] = useState("XBITbls");
  const [businessArea, setBusinessArea] = useState("XBI");

  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [pendingTables, setPendingTables] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [previousTables, setPreviousTables] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      const savedTables = localStorage.getItem("tables");
      const tables = savedTables ? JSON.parse(savedTables) : [];
      const pendTables = tables.filter((t) => t.status === "pending");

      const savedSubs = localStorage.getItem("schemaSubmissions");
      const subs = savedSubs ? JSON.parse(savedSubs) : [];
      const pendSubs = subs.filter((s) => s.status === "pending");

      setPendingTables(pendTables);
      setPendingSubmissions(pendSubs);
      setPendingCount(pendTables.length + pendSubs.length);

      const names = new Set();
      const list = [];

      const defaults = [
        { name: "XBITbls.RptSvcUnitMthSellin", id: "default1", type: "default" },
        { name: "XDW.SampleTable", id: "default2", type: "default" }
      ];
      defaults.forEach(d => {
        names.add(d.name.toLowerCase());
        list.push(d);
      });

      tables.forEach(t => {
        const name = t.tableName || t.name;
        if (name && !names.has(name.toLowerCase())) {
          names.add(name.toLowerCase());
          list.push({ name, id: t.id || `table-${name}`, type: "table" });
        }
      });

      subs.forEach(s => {
        const name = s.tableName;
        if (name && !names.has(name.toLowerCase())) {
          names.add(name.toLowerCase());
          list.push({ name, id: s.id, type: "submission" });
        }
      });

      setPreviousTables(list);
    };

    load();

    const onStorage = () => {
      load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleSelectTable = (table) => {
    setSearchTerm(table.name);
    setIsOpen(false);
    if (table.type === "submission") {
      navigate(`/datamodelnew?submissionId=${table.id}`);
    } else {
      navigate(`/datamodelnew?tableName=${encodeURIComponent(table.name)}`);
    }
  };

  const userRole = localStorage.getItem("userRole") || "Unknown";
  const isArchitect = userRole === "architect";

  const handleEditInModal = (id, field, value) => {
    setPendingTables((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, [field]: value } : p));
      const saved = JSON.parse(localStorage.getItem("tables") || "[]");
      const merged = saved.map((item) =>
         item.id === id ? { ...item, [field]: value } : item
      );
      localStorage.setItem("tables", JSON.stringify(merged));
      return updated;
    });
  };

  const handleAcceptInModal = (id) => {
    const saved = localStorage.getItem("tables");
    const tables = saved ? JSON.parse(saved) : [];
    const updated = tables.map((t) => {
      if (t.id === id) {
        const pending = pendingTables.find((p) => p.id === id) || t;
        return { ...t, ...pending, status: "approved", approved: true };
      }
      return t;
    });
    localStorage.setItem("tables", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const handleRejectInModal = (id) => {
    const saved = localStorage.getItem("tables");
    const tables = saved ? JSON.parse(saved) : [];
    const updated = tables.map((t) => (t.id === id ? { ...t, status: "rejected" } : t));
    localStorage.setItem("tables", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const handleRejectSubmission = (id) => {
    const savedSubs = JSON.parse(localStorage.getItem("schemaSubmissions") || "[]");
    const updated = savedSubs.map(s => s.id === id ? { ...s, status: "rejected" } : s);
    localStorage.setItem("schemaSubmissions", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const handleHeaderFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const processData = (parsedData) => {
      localStorage.setItem(
        "pendingTemplateFile",
        JSON.stringify({
          name: selectedFile.name,
          data: parsedData,
        })
      );
      window.dispatchEvent(new Event("templateUploaded"));
      navigate("/datamodel");
      e.target.value = "";
    };

    if (selectedFile.name.endsWith(".csv")) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processData(results.data);
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
        processData(data);
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  const styles = {
    container: {
      display: "flex",
      minHeight: "100vh",
      background: muiTheme.palette.background.default
    },

    leftPanel: {
      background: mode === 'light' ? "#1e293b" : "#0f172a",
      color: muiTheme.palette.text.primary,
      padding: "20px",
      transition: "0.3s"
    },

    rightPanel: {
      flex: 1,
      padding: "40px",
      background: muiTheme.palette.background.paper,
      color: muiTheme.palette.text.primary
    },

    select: {
      width: "100%",
      padding: "8px",
      marginTop: "8px",
      background: muiTheme.palette.background.paper,
      color: muiTheme.palette.text.primary,
      border: `1px solid ${muiTheme.palette.divider}`
    },
    navbar: {
      display: "flex",
      gap: "20px",
      marginBottom: "30px",
      borderBottom: `1px solid ${muiTheme.palette.divider}`,
      paddingBottom: "10px",
      justifyContent: "space-between",
      alignItems: "center"
    },

    nav: {
      textDecoration: "none",
      color: muiTheme.palette.text.secondary,
      fontWeight: "600",
      cursor: "pointer"
    },

    activeNav: {
      textDecoration: "none",
      color: muiTheme.palette.primary.main,
      fontWeight: "700",
      borderBottom: `2px solid ${muiTheme.palette.primary.main}`,
      cursor: "pointer"
    },
    
    dropdownSection: {
      marginBottom: "20px"
    },

    orText: {
      marginBottom: "8px",
      color: muiTheme.palette.text.secondary,
      fontWeight: "500"
    },

    dropdown: {
      width: "320px",
      padding: "10px",
      borderRadius: "8px",
      border: `1px solid ${muiTheme.palette.divider}`,
      background: muiTheme.palette.background.paper,
      color: muiTheme.palette.text.primary,
      fontSize: "14px"
    },

    themeToggle: {
      background: muiTheme.palette.primary.main,
      color: "#fff",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "14px",
      transition: "0.3s"
    }
  };

  return (

    <div style={styles.container}>

      {/* LEFT SIDEBAR */}
      <div
        style={{
          ...styles.leftPanel,
          width: isSidebarOpen ? "260px" : "80px"
        }}
      >

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ marginBottom: "20px", cursor: "pointer" }}
        >
          ☰
        </button>

        <div>
          <FaServer />
          {isSidebarOpen && <h4>Cluster</h4>}
          {isSidebarOpen && (
            <select
              style={styles.select}
              value={cluster}
              onChange={(e) => setCluster(e.target.value)}
            >
              <option>dev-redshift-cluster</option>
              <option>qa-redshift-cluster</option>
              <option>prod-redshift-cluster</option>
            </select>
          )}
        </div>

        <div>
          <FaDatabase />
          {isSidebarOpen && <h4>Schema</h4>}
          {isSidebarOpen && (
            <select
              style={styles.select}
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
            >
              <option>XBITbls</option>
              <option>XDW</option>
            </select>
          )}
        </div>

        <div>
          <FaChartBar />
          {isSidebarOpen && <h4>Business Area</h4>}
          {isSidebarOpen && (
            <select
              style={styles.select}
              value={businessArea}
              onChange={(e) => setBusinessArea(e.target.value)}
            >
              <option>XBI</option>
              <option>XDW</option>
            </select>
          )}
        </div>

      </div>


      {/* RIGHT PANEL CONTENT */}
      <div style={styles.rightPanel}>
 

  {/* TOP NAVBAR */}
  <div style={styles.navbar}>

    <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
      <NavLink
        to="/"
        style={({ isActive }) =>
          isActive ? styles.activeNav : styles.nav
        }
      >
        Dashboard
      </NavLink>

      <NavLink
        to="/datamodel"
        style={({ isActive }) =>
          isActive ? styles.activeNav : styles.nav
        }
      >
        Data Model
      </NavLink>

      <NavLink
        to="/datamodelnew"
        style={({ isActive }) =>
          isActive ? styles.activeNav : styles.nav
        }
      >
        Advanced Form
      </NavLink>

      {/* Notification Bell - Only for Architect View */}
      {isArchitect && (
        <>
          <button
            onClick={() => setShowNotif(true)}
            title="Pending changes"
            style={{
              position: "relative",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: muiTheme.palette.text.secondary,
              padding: "6px",
            }}
          >
            <FaBell size={18} />
            {pendingCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  background: "#ef4444",
                  color: "#fff",
                  borderRadius: "50%",
                  padding: "2px 6px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
              <div style={{background: muiTheme.palette.background.paper, color: muiTheme.palette.text.primary, padding: '16px', borderRadius: '8px', width: '520px', maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 6px 24px rgba(0,0,0,0.2)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                  <strong>Pending Changes</strong>
                  <button onClick={() => setShowNotif(false)} style={{border: 'none', background: 'transparent', cursor: 'pointer'}}>✕</button>
                </div>

                {pendingTables.length === 0 && pendingSubmissions.length === 0 ? (
                  <p style={{margin:0}}>No pending changes</p>
                ) : (
                  <>
                    {/* Rich Schema Submissions Section */}
                    {pendingSubmissions.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: muiTheme.palette.text.secondary, marginBottom: "8px", borderBottom: `1px solid ${muiTheme.palette.divider}`, paddingBottom: "4px" }}>
                          Rich Schema Submissions ({pendingSubmissions.length})
                        </div>
                        {pendingSubmissions.map((s) => (
                          <div key={s.id} style={{ marginBottom: 12, padding: 12, borderRadius: '8px', border: `1px solid ${muiTheme.palette.divider}`, background: muiTheme.palette.background.default }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                              <strong style={{ fontSize: "13px", color: muiTheme.palette.text.primary }}>{s.tableName}</strong>
                              <span style={{ fontSize: "10px", background: "#3b82f6", color: "#fff", padding: "2px 6px", borderRadius: "3px", fontWeight: "bold" }}>Schema Submission</span>
                            </div>
                            <div style={{ fontSize: "11px", color: muiTheme.palette.text.secondary, marginBottom: "10px" }}>
                              <div>Logical: {s.tableData?.entityLogicalName || "(not set)"}</div>
                              <div>Vertical: {s.tableData?.verticalName || "(not set)"}</div>
                              <div>Steward: {s.dataProductData?.dataSteward || "(not set)"}</div>
                              <div style={{ marginTop: "3px", fontStyle: "italic" }}>Submitted by {s.submittedBy}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => {
                                  setShowNotif(false);
                                  navigate(`/datamodelnew?submissionId=${s.id}`);
                                }}
                                style={{ flex: 1, padding: 6, background: muiTheme.palette.primary.main, color: '#fff', border: 'none', borderRadius: 6, fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                              >
                                Review & Edit
                              </button>
                              <button
                                onClick={() => handleRejectSubmission(s.id)}
                                style={{ flex: 1, padding: 6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Legacy/Simple Pending Tables Section */}
                    {pendingTables.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: muiTheme.palette.text.secondary, marginBottom: "8px", borderBottom: `1px solid ${muiTheme.palette.divider}`, paddingBottom: "4px" }}>
                          Simple/Legacy Submissions ({pendingTables.length})
                        </div>
                        {pendingTables.map((t) => (
                          <div key={t.id} style={{ marginBottom: 12, padding: 12, borderRadius: '8px', border: `1px solid ${muiTheme.palette.divider}`, background: muiTheme.palette.background.default }}>
                            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr', marginBottom: "10px" }}>
                              <input
                                value={t.action || ""}
                                placeholder="Action"
                                onChange={(e) => handleEditInModal(t.id, 'action', e.target.value)}
                                style={{ padding: 6, borderRadius: 6, border: `1px solid ${muiTheme.palette.divider}`, fontSize: "11px", background: muiTheme.palette.background.paper, color: muiTheme.palette.text.primary }}
                              />
                              <input
                                value={t.tableName || ""}
                                placeholder="Table Name"
                                onChange={(e) => handleEditInModal(t.id, 'tableName', e.target.value)}
                                style={{ padding: 6, borderRadius: 6, border: `1px solid ${muiTheme.palette.divider}`, fontSize: "11px", background: muiTheme.palette.background.paper, color: muiTheme.palette.text.primary }}
                              />
                              <input
                                value={t.columnName || ""}
                                placeholder="Column Name"
                                onChange={(e) => handleEditInModal(t.id, 'columnName', e.target.value)}
                                style={{ padding: 6, borderRadius: 6, border: `1px solid ${muiTheme.palette.divider}`, fontSize: "11px", background: muiTheme.palette.background.paper, color: muiTheme.palette.text.primary }}
                              />
                              <input
                                value={t.dataType || ""}
                                placeholder="Data Type"
                                onChange={(e) => handleEditInModal(t.id, 'dataType', e.target.value)}
                                style={{ padding: 6, borderRadius: 6, border: `1px solid ${muiTheme.palette.divider}`, fontSize: "11px", background: muiTheme.palette.background.paper, color: muiTheme.palette.text.primary }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleAcceptInModal(t.id)} style={{ flex: 1, padding: 6, background: muiTheme.palette.primary.main, color: '#fff', border: 'none', borderRadius: 6, fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}>Accept</button>
                              <button onClick={() => handleRejectInModal(t.id)} style={{ flex: 1, padding: 6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}>Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          )}
        </>
      )}
    </div>

    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
      {/* User Role Display */}
      <span style={{ 
        color: muiTheme.palette.text.primary,
        fontWeight: "500",
        fontSize: "14px",
        textTransform: "capitalize"
      }}>
        {userRole === "developer" ? "Developer View" : "Architect View"}
      </span>

      {/* Upload Button */}
      <input
        type="file"
        id="headerFileUpload"
        accept=".csv, .xlsx"
        style={{ display: "none" }}
        onChange={handleHeaderFileChange}
      />
      <button
        className="upload-btn"
        onClick={() => document.getElementById("headerFileUpload").click()}
      >
        Upload Template
      </button>

      {/* Theme Toggle Button */}
      <button onClick={toggleTheme} style={styles.themeToggle}>
        {mode === "light" ? "🌙" : "☀️"}
      </button>

      {/* Logout Button */}
      <button onClick={handleLogout} style={styles.themeToggle}>
        Logout
      </button>
    </div>

  </div>

   {/* PAGE CONTENT */}

{/* ADD DROPDOWN HERE */}
<div style={styles.dropdownSection}>

  <p style={styles.orText}>(And/Or)</p>

  <div style={{ position: "relative", width: "320px" }}>
    <input
      type="text"
      placeholder="Search previous tables..."
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
      }}
      onFocus={() => setIsOpen(true)}
      onBlur={() => {
        setTimeout(() => setIsOpen(false), 200);
      }}
      style={{
        ...styles.dropdown,
        width: "100%",
        boxSizing: "border-box",
      }}
    />

    {isOpen && (
      <ul style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 1000,
        margin: "4px 0 0 0",
        padding: "4px 0",
        listStyle: "none",
        background: mode === 'light' ? "#ffffff" : "#1e293b",
        border: `1px solid ${muiTheme.palette.divider}`,
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        maxHeight: "200px",
        overflowY: "auto"
      }}>
        {previousTables
          .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((table) => (
            <li
              key={table.id}
              onClick={() => handleSelectTable(table)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "13px",
                color: muiTheme.palette.text.primary,
                transition: "background 0.2s",
                borderBottom: `1px solid ${muiTheme.palette.divider}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = mode === 'light' ? "#f1f5f9" : "#334155";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{ fontWeight: "600" }}>{table.name}</div>
              <div style={{ fontSize: "11px", color: muiTheme.palette.text.secondary, textTransform: "capitalize" }}>
                {table.type === "submission" ? "Draft / Pending" : table.type === "table" ? "Approved Table" : "System Default"}
              </div>
            </li>
          ))}
      </ul>
    )}
  </div>

</div>

<Outlet />

</div>
      

    </div>

  );
}

export default Layout;