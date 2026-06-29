function BusinessPanel({ businessArea, setBusinessArea }) {
  return (
    <div>
      <h2>Business Area Settings</h2>

      <p>Select business area:</p>

      <select
        value={businessArea}
        onChange={(e) => setBusinessArea(e.target.value)}
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      >
        <option>XBI</option>
        <option>XDW</option>
      </select>
    </div>
  );
}

export default BusinessPanel;