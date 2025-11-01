import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import UploadGeburtsurkunde from "./pages/UploadGeburtsurkunde";
import GeburtsurkunderResult from "./pages/GeburtsurkunderResult";
import GeburtsurkunderList from "./pages/GeburtsurkunderList";
import UploadElternDokument from "./pages/UploadElternDokument";
import ElternDokumentResult from "./pages/ElternDokumentResult";
import ElternDokumenteList from "./pages/ElternDokumenteList";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload-geburtsurkunde" element={<UploadGeburtsurkunde />} />
        <Route path="/geburtsurkunde-result" element={<GeburtsurkunderResult />} />
        <Route path="/geburtsurkunden-list" element={<GeburtsurkunderList />} />
        <Route path="/upload-eltern-dokument" element={<UploadElternDokument />} />
        <Route path="/eltern-dokument-result" element={<ElternDokumentResult />} />
        <Route path="/eltern-dokumente-list" element={<ElternDokumenteList />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
