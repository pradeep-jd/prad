import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  Alert,
} from "@mui/material";
import { useContext } from "react";
import { ThemeContext } from "../App";

const Login = ({ onLogin }) => {
  const [viewType, setViewType] = useState("developer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { mode } = useContext(ThemeContext);

  const credentials = {
    developer: { user: "dev1234", password: "123456" },
    architect: { user: "arch1234", password: "123456" },
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validCredentials = credentials[viewType];

    if (
      username === validCredentials.user &&
      password === validCredentials.password
    ) {
      onLogin(viewType);
      navigate("/");
      setUsername("");
      setPassword("");
    } else {
      setError("Invalid username or password for the selected view");
      setPassword("");
    }

    setLoading(false);
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: mode === "dark" ? "#121212" : "#f5f5f5",
      }}
    >
      <Card
        sx={{
          padding: 4,
          boxShadow: 3,
          width: "100%",
          backgroundColor: mode === "dark" ? "#1e1e1e" : "#ffffff",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            textAlign: "center",
            marginBottom: 3,
            fontWeight: "bold",
            color: mode === "dark" ? "#ffffff" : "#000000",
          }}
        >
          Login
        </Typography>

        <form onSubmit={handleLogin}>
          <Box sx={{ marginBottom: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ marginBottom: 1, color: mode === "dark" ? "#b0b0b0" : "#555" }}
            >
              Select View Type
            </Typography>
            <TextField
              select
              fullWidth
              value={viewType}
              onChange={(e) => {
                setViewType(e.target.value);
                setError("");
              }}
              variant="outlined"
            >
              <MenuItem value="developer">Developer View</MenuItem>
              <MenuItem value="architect">Architect View</MenuItem>
            </TextField>
          </Box>

          <Box sx={{ marginBottom: 2 }}>
            <TextField
              fullWidth
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              variant="outlined"
            />
          </Box>

          <Box sx={{ marginBottom: 3 }}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              variant="outlined"
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
            disabled={loading}
            sx={{
              padding: "10px",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            marginTop: 3,
            textAlign: "center",
            color: mode === "dark" ? "#888" : "#999",
          }}
        >
          Demo Credentials:
          <br />
          Developer: dev1234 / 123456
          <br />
          Architect: arch1234 / 123456
        </Typography>
      </Card>
    </Container>
  );
};

export default Login;
