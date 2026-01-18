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
import UploadLeistungsbescheid from "./pages/UploadLeistungsbescheid";
import LeistungsbescheidResult from "./pages/LeistungsbescheidResult";
import LeistungsbescheideList from "./pages/LeistungsbescheideList";
import UploadBankverbindung from "./pages/UploadBankverbindung";
import BankverbindungResult from "./pages/BankverbindungResult";
import BankverbindungenList from "./pages/BankverbindungenList";
import UploadMeldebescheinigung from "./pages/UploadMeldebescheinigung";
import MeldebescheinigungResult from "./pages/MeldebescheinigungResult";
import MeldebescheinigungenList from "./pages/MeldebescheinigungenList";
import UploadKrankenversicherung from "./pages/UploadKrankenversicherung";
import KrankenversicherungResult from "./pages/KrankenversicherungResult";
import KrankenversicherungList from "./pages/KrankenversicherungList";
import UploadEheSorgerecht from "./pages/UploadEheSorgerecht";
import EheSorgerechtResult from "./pages/EheSorgerechtResult";
import EheSorgerechtList from "./pages/EheSorgerechtList";
import UploadAdoptionsPflege from "./pages/UploadAdoptionsPflege";
import AdoptionsPflegeResult from "./pages/AdoptionsPflegeResult";
import AdoptionsPflegeList from "./pages/AdoptionsPflegeList";
import ElterngeldantragAusfuellen from "./pages/ElterngeldantragAusfuellen";
import AdminSetup from "./pages/AdminSetup";
import AutoCleanupSettings from "./pages/AutoCleanupSettings";
import AdminFieldMapper from "./pages/AdminFieldMapper";
import FieldDiagnostics from "./pages/FieldDiagnostics";
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
        <Route path="/upload-leistungsbescheid" element={<UploadLeistungsbescheid />} />
        <Route path="/leistungsbescheid-result" element={<LeistungsbescheidResult />} />
        <Route path="/leistungsbescheide-list" element={<LeistungsbescheideList />} />
        <Route path="/upload-bankverbindung" element={<UploadBankverbindung />} />
        <Route path="/bankverbindung-result" element={<BankverbindungResult />} />
        <Route path="/bankverbindungen-list" element={<BankverbindungenList />} />
        <Route path="/upload-meldebescheinigung" element={<UploadMeldebescheinigung />} />
        <Route path="/meldebescheinigung-result" element={<MeldebescheinigungResult />} />
        <Route path="/meldebescheinigungen-list" element={<MeldebescheinigungenList />} />
        <Route path="/upload-krankenversicherung" element={<UploadKrankenversicherung />} />
        <Route path="/krankenversicherung-result" element={<KrankenversicherungResult />} />
        <Route path="/krankenversicherung-list" element={<KrankenversicherungList />} />
        <Route path="/upload-ehe-sorgerecht" element={<UploadEheSorgerecht />} />
        <Route path="/ehe-sorgerecht-result" element={<EheSorgerechtResult />} />
        <Route path="/ehe-sorgerecht-list" element={<EheSorgerechtList />} />
        <Route path="/upload-adoptions-pflege" element={<UploadAdoptionsPflege />} />
        <Route path="/adoptions-pflege-result" element={<AdoptionsPflegeResult />} />
        <Route path="/adoptions-pflege-list" element={<AdoptionsPflegeList />} />
        <Route path="/elterngeldantrag-ausfuellen" element={<ElterngeldantragAusfuellen />} />
        <Route path="/admin-setup" element={<AdminSetup />} />
        <Route path="/auto-cleanup-settings" element={<AutoCleanupSettings />} />
        <Route path="/admin/field-mapper" element={<AdminFieldMapper />} />
        <Route path="/admin/field-diagnostics" element={<FieldDiagnostics />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
