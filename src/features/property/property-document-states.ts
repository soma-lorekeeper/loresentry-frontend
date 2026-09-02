import {
  createInitialPropertyDocument,
  type PropertyDocument,
  propertyFileIcons,
  type PropertyFileType,
  type PropertyDocumentSaveStatus,
} from "./components/property-document";

export const PROPERTY_DOCUMENT_SCREEN_STATES = [
  {
    documentId: "setting",
    id: "setting-default",
    label: "설정",
    pencilNodeId: "V3E9p",
    screenNumber: 52,
    saveStatus: "saved",
  },
  {
    documentId: "worldbuilding",
    id: "worldbuilding-default",
    label: "세계관",
    pencilNodeId: "Cr1QM",
    screenNumber: 53,
    saveStatus: "saved",
  },
  {
    documentId: "place",
    id: "place-default",
    label: "장소",
    pencilNodeId: "A9aCt",
    screenNumber: 54,
    saveStatus: "saved",
  },
  {
    documentId: "worldbuilding",
    empty: true,
    id: "worldbuilding-empty",
    label: "세계관",
    pencilNodeId: "B194Dr",
    screenNumber: 55,
    saveStatus: "saved",
  },
  {
    documentId: "place",
    id: "place-type-menu",
    label: "장소",
    openTypeMenu: true,
    pencilNodeId: "Y7tLK",
    screenNumber: 56,
    saveStatus: "saved",
  },
  {
    documentId: "setting",
    id: "setting-saving",
    label: "설정",
    pencilNodeId: "XWX3g",
    screenNumber: 57,
    saveStatus: "saving",
  },
  {
    documentId: "setting",
    id: "setting-save-error",
    label: "설정",
    pencilNodeId: "N05XrO",
    screenNumber: 58,
    saveStatus: "error",
  },
  {
    documentId: "character",
    id: "character-default",
    label: "캐릭터",
    pencilNodeId: "S0KR3j",
    screenNumber: 59,
    saveStatus: "saved",
  },
  {
    documentId: "organization",
    id: "organization-default",
    label: "조직",
    pencilNodeId: "HRRGt",
    screenNumber: 60,
    saveStatus: "saved",
  },
  {
    documentId: "item",
    id: "item-default",
    label: "아이템",
    pencilNodeId: "aEeBT",
    screenNumber: 61,
    saveStatus: "saved",
  },
  {
    documentId: "character",
    empty: true,
    id: "character-empty",
    label: "캐릭터",
    pencilNodeId: "ZooEr",
    screenNumber: 62,
    saveStatus: "saved",
  },
  {
    documentId: "organization",
    id: "organization-type-menu",
    label: "조직",
    openTypeMenu: true,
    pencilNodeId: "R5JCCJ",
    screenNumber: 63,
    saveStatus: "saved",
  },
  {
    documentId: "item",
    id: "item-save-error",
    label: "아이템",
    pencilNodeId: "t3UXM",
    screenNumber: 64,
    saveStatus: "error",
  },
] as const satisfies ReadonlyArray<{
  documentId: PropertyFileType;
  empty?: boolean;
  id: string;
  label: string;
  openTypeMenu?: boolean;
  pencilNodeId: string;
  saveStatus: PropertyDocumentSaveStatus;
  screenNumber: number;
}>;

export type PropertyDocumentStateId =
  (typeof PROPERTY_DOCUMENT_SCREEN_STATES)[number]["id"];

export interface PropertyDocumentScenario {
  document: PropertyDocument;
  documentId: PropertyFileType;
  icon: ReturnType<typeof getPropertyDocumentIcon>;
  initialOpenTypeMenuFor?: string;
  label: string;
  stateId: PropertyDocumentStateId;
}

function getPropertyDocumentIcon(documentId: PropertyFileType) {
  return propertyFileIcons[documentId];
}

export function resolvePropertyDocumentStateId(
  value: string | null,
): PropertyDocumentStateId | undefined {
  return PROPERTY_DOCUMENT_SCREEN_STATES.some((state) => state.id === value)
    ? (value as PropertyDocumentStateId)
    : undefined;
}

export function createPropertyDocumentScenario(
  stateId: PropertyDocumentStateId,
): PropertyDocumentScenario {
  const state = PROPERTY_DOCUMENT_SCREEN_STATES.find(
    (candidate) => candidate.id === stateId,
  )!;
  const document = createInitialPropertyDocument(state.documentId, state.label);
  if ("empty" in state && state.empty) {
    document.body = "";
    document.properties = [];
    document.title = "";
  }
  document.saveStatus = state.saveStatus;

  return {
    document,
    documentId: state.documentId,
    icon: getPropertyDocumentIcon(state.documentId),
    initialOpenTypeMenuFor:
      "openTypeMenu" in state && state.openTypeMenu
        ? document.properties[0]?.id
        : undefined,
    label: state.label,
    stateId,
  };
}
