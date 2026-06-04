import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Workspace from "@/pages/Workspace";
import Board from "@/pages/Board";
import DailyReport from "@/pages/DailyReport";
import Agents from "@/pages/Agents";
import Deliverables from "@/pages/Deliverables";
import Inspiration from "@/pages/Inspiration";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/project/:id/workspace" element={<Workspace />} />
          <Route path="/project/:id/board" element={<Board />} />
          <Route path="/project/:id/daily" element={<DailyReport />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/inspiration" element={<Inspiration />} />
          <Route path="/deliverables" element={<Deliverables />} />
        </Routes>
      </Layout>
    </Router>
  );
}
