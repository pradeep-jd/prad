import { useNavigate } from "react-router-dom";

function Sidebar() {

  const navigate = useNavigate();

  return (
    <div
      style={{
        width: "220px",
        background: "#2f3e4d",
        color: "white",
        height: "100vh",
        padding: "20px"
      }}
    >
      <h2>Menu</h2>

      <button
        style={{ width: "100%", marginBottom: "15px" }}
        onClick={() => navigate("/cluster")}
      >
        Cluster
      </button>

      <button
        style={{ width: "100%", marginBottom: "15px" }}
        onClick={() => navigate("/schema")}
      >
        Schema
      </button>

      <button
        style={{ width: "100%" }}
        onClick={() => navigate("/business")}
      >
        Business Area
      </button>

    </div>
  );
}

export default Sidebar;