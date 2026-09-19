import { GUIDE_TOPICS } from "@/features/help/guide-content";

import type { HelpService } from "../ports";

import { simulate } from "./control";

export const mockHelp: HelpService = {
  guides: () => simulate("help.guides", () => GUIDE_TOPICS),
};
