function ClusterPanel({ cluster, setCluster }) {
  return (
    <div>
      <h2>Cluster Settings</h2>

      <p>Select your cluster:</p>

      <select
        value={cluster}
        onChange={(e) => setCluster(e.target.value)}
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      >
        <option>dev-redshift-cluster</option>
        <option>qa-redshift-cluster</option>
        <option>prod-redshift-cluster</option>
      </select>
    </div>
  );
}

export default ClusterPanel;