<div className="main-container">
  
  {/* LEFT SIDE */}
  <div className="left-panel">
    <button>New Table</button>
    <button>Remove Table</button>

    <p>(And/Or)</p>

    <select>
      <option>svcUnitMthSellIn</option>
    </select>

    <button>Refresh Table</button>
  </div>

  {/* ARROW */}
  <div className="arrow">➡️</div>

  {/* RIGHT SIDE */}
  <div className="right-panel">
  <p className="upload-text">
    Apply changes to the new or existing tables, click on "Upload Template" button
  </p>

  <>
  {/* Hidden file input */}
  <input
  type="file"
  id="fileUpload"
  accept=".csv, .xlsx"
  style={{ display: "none" }}
  onChange={handleFileChange}
/>

  {/* Button */}
  <button
    className="upload-btn"
    onClick={() => document.getElementById("fileUpload").click()}
  >
    Upload Template
  </button>
</>
</div>

</div>