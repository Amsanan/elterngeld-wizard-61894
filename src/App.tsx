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
import UploadSteuerbescheid from "./pages/UploadSteuerbescheid";
import SteuerbescheidResult from "./pages/SteuerbescheidResult";
import SteuerbescheideList from "./pages/SteuerbescheideList";
import UploadArbeitgeberbescheinigung from "./pages/UploadArbeitgeberbescheinigung";
import ArbeitgeberbescheinigungResult from "./pages/ArbeitgeberbescheinigungResult";
import ArbeitgeberbescheinigungList from "./pages/ArbeitgeberbescheinigungList";
import UploadGehaltsnachweis from "./pages/UploadGehaltsnachweis";
import GehaltsnachweisResult from "./pages/GehaltsnachweisResult";
import GehaltsnachweiseList from "./pages/GehaltsnachweiseList";
import UploadMutterschaftsgeld from "./pages/UploadMutterschaftsgeld";
import MutterschaftsgeldResult from "./pages/MutterschaftsgeldResult";
import MutterschaftsgeldList from "./pages/MutterschaftsgeldList";
import UploadSelbststaendigenNachweis from "./pages/UploadSelbststaendigenNachweis";
import SelbststaendigenNachweisResult from "./pages/SelbststaendigenNachweisResult";
import SelbststaendigenNachweiseList from "./pages/SelbststaendigenNachweiseList";
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
        <Route path="/upload-steuerbescheid" element={<UploadSteuerbescheid />} />
        <Route path="/steuerbescheid-result/:id" element={<SteuerbescheidResult />} />
        <Route path="/steuerbescheide-list" element={<SteuerbescheideList />} />
        <Route path="/upload-arbeitgeberbescheinigung" element={<UploadArbeitgeberbescheinigung />} />
        <Route path="/arbeitgeberbescheinigung-result" element={<ArbeitgeberbescheinigungResult />} />
        <Route path="/arbeitgeberbescheinigungen-list" element={<ArbeitgeberbescheinigungList />} />
        <Route path="/upload-gehaltsnachweis" element={<UploadGehaltsnachweis />} />
        <Route path="/gehaltsnachweis-result" element={<GehaltsnachweisResult />} />
        <Route path="/gehaltsnachweise-list" element={<GehaltsnachweiseList />} />
        <Route path="/upload-mutterschaftsgeld" element={<UploadMutterschaftsgeld />} />
        <Route path="/mutterschaftsgeld-result" element={<MutterschaftsgeldResult />} />
        <Route path="/mutterschaftsgeld-list" element={<MutterschaftsgeldList />} />
        <Route path="/upload-selbststaendigen-nachweis" element={<UploadSelbststaendigenNachweis />} />
        <Route path="/selbststaendigen-nachweis-result" element={<SelbststaendigenNachweisResult />} />
        <Route path="/selbststaendigen-nachweise-list" element={<SelbststaendigenNachweiseList />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
