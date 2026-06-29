import { useNavigate } from "react-router-dom";

function Home() {

  const navigate = useNavigate();

  return (
    <div style={{ padding: "40px" }}>
      <h1>Home Page</h1>

      <button
        onClick={() => navigate("/datamodel")}
        style={{
          padding: "12px",
          background: "#4f46e5",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        Data Model
      </button>

    </div>
  );
}

export default Home;