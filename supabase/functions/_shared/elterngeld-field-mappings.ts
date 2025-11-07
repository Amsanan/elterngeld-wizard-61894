// Workflow steps for the Elterngeldantrag process
// Defines the document collection sequence

export const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Geburtsurkunde",
    documentType: "geburtsurkunde",
    tableName: "geburtsurkunden",
    description: "Angaben zum Kind",
    icon: "FileText"
  },
  {
    step: 2,
    title: "Personalausweis Vater",
    documentType: "eltern_dokument_vater",
    tableName: "eltern_dokumente",
    filter: { person_type: "vater", document_type: "personalausweis" },
    description: "Angaben zum Vater",
    icon: "User"
  },
  {
    step: 3,
    title: "Personalausweis Mutter",
    documentType: "eltern_dokument_mutter",
    tableName: "eltern_dokumente",
    filter: { person_type: "mutter", document_type: "personalausweis" },
    description: "Angaben zur Mutter",
    icon: "User"
  },
  {
    step: 4,
    title: "Meldebescheinigung Vater",
    documentType: "meldebescheinigung_vater",
    tableName: "meldebescheinigungen",
    filter: { person_type: "vater" },
    description: "Wohnsitz Vater",
    icon: "Home"
  },
  {
    step: 5,
    title: "Meldebescheinigung Mutter",
    documentType: "meldebescheinigung_mutter",
    tableName: "meldebescheinigungen",
    filter: { person_type: "mutter" },
    description: "Wohnsitz Mutter",
    icon: "Home"
  }
];
