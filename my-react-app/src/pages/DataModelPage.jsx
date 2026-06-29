import { useLocation } from "react-router-dom";
import DataModelForm from "../components/DataModelForm";

function DataModelPage() {

  const location = useLocation();
  const selectedTable = location.state?.selectedTable;

  return (
    <div>
      <h2>Data Model</h2>

      {selectedTable && (
        <p style={{ color: "#4f46e5" }}>
          Selected Table: {selectedTable}
        </p>
      )}

      <DataModelForm selectedTable={selectedTable} />
    </div>
  );
}

export default DataModelPage;