import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import WordListPage from "./pages/WordListPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/words" replace />}
        />

        <Route
          path="/words"
          element={<WordListPage />}
        />

        <Route
          path="*"
          element={<h2>Không tìm thấy trang</h2>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;