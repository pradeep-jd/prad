function SchemaPanel({ schema, setSchema }) {
  return (
    <div>
      <h2>Schema Settings</h2>

      <p>Select your schema:</p>

      <select
        value={schema}
        onChange={(e) => setSchema(e.target.value)}
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      >
        <option>XBITbls</option>
        <option>XDW</option>
      </select>
    </div>
  );
}

export default SchemaPanel;